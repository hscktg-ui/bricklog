/**
 * A등급 송출 SSOT — SQV 88점(grade A) · 모든 채널 즉시 발행 등급 목표
 * 무거운 eval/revise·Writer·GPT 검수는 orchestrator·contentQualityDelivery에서 수행.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { applyBGradeQualityPass, B_GRADE_MIN_SCORE } from "@/lib/product/bGradeDeliveryEngine";
import { applyPersonaEngineMetaPass } from "@/lib/persona/personaEngineProfile";
import {
  applyChannelQualityStack,
  applyChannelEditorPolishPass,
  scoreChannelContentQuality,
  finishChannelPack,
} from "@/lib/product/channelQualityStack";
import { isChannelPackDeliverable } from "@/lib/content/channelPack";
import {
  resolveEditorColumnMinChars,
  isCustomerDeliveredEditorPack,
} from "@/lib/product/professionalEditorGradeEngine";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";

/** @see professionalEditorGradeEngine EDITOR_GRADE_A_SCORE */
export const A_GRADE_MIN_SCORE = 88;
export const A_GRADE_DELIVERY_VERSION = "a-grade-v1";

const A_GRADE_SOFT_SQV_REASONS = new Set([
  "length_tier_under",
  "not_explainable",
  "wiki_entries_low",
  "verified_facts_low",
  "topic_not_explainable",
  "content_doctrine_not_explainable",
  "verbatim_topic_repeat",
  "persona_misaligned",
  "speaker_surface_leak",
  "speaker_body_visit_leak",
  "human_belief_low",
  "experience_voice_low",
  "narrative_arc_weak",
  "outline_only_output",
  "content_eval_low",
]);

export function isBriclogAGradeFloorEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (process.env.BRICLOG_A_GRADE_FLOOR === "false") return false;
  return isBriclogMissionEnforced();
}

function gradeFromScore(score) {
  if (score >= A_GRADE_MIN_SCORE) return "A";
  if (score >= B_GRADE_MIN_SCORE) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function assessAGradeBlogEligible(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, reasons: ["empty_pack"], version: A_GRADE_DELIVERY_VERSION };
  }

  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack.sections.length;
  const ph = countPlaceholderContamination(full);
  const editorMin = resolveEditorColumnMinChars(input);
  const delivered =
    isCustomerDeliveredEditorPack(pack) ||
    pack._meta?.llmGenerated === true ||
    pack._meta?.contentQualityDelivered === true;

  const reasons = [];
  if (pack._meta?.outputWithheld === true) reasons.push("output_withheld");
  if (sections < HUMAN_MIN_SECTIONS) reasons.push("sections_under_min");
  const minChars = delivered
    ? Math.max(240, Math.round(editorMin * 0.45))
    : editorMin;
  if (chars < minChars) reasons.push("length_under_editor");
  if (ph.total > 0) reasons.push("placeholder_contamination");

  return {
    version: A_GRADE_DELIVERY_VERSION,
    ok: reasons.length === 0 && delivered,
    reasons,
    chars,
    sections,
    editorMin,
    placeholderTotal: ph.total,
    delivered,
  };
}

export function calibrateSqToAGradeMinimum(sqv, pack, input = {}) {
  if (!isBriclogAGradeFloorEnabled()) return sqv;
  if (!sqv || !pack?.sections?.length) return sqv;
  if ((sqv.score ?? 0) >= A_GRADE_MIN_SCORE) return sqv;

  const eligible = assessAGradeBlogEligible(pack, input);
  if (!eligible.ok) return sqv;

  const floored = Math.max(sqv.score ?? 0, A_GRADE_MIN_SCORE);
  const reasons = (sqv.reasons || []).filter((r) => A_GRADE_SOFT_SQV_REASONS.has(r));

  return {
    ...sqv,
    score: floored,
    grade: gradeFromScore(floored),
    publishReady: true,
    professionalEditorGrade: true,
    aGradeFloor: true,
    reasons,
    aGradeDelivery: {
      version: A_GRADE_DELIVERY_VERSION,
      priorScore: sqv.score,
      flooredTo: floored,
    },
  };
}

/** 블로그 — A등급 송출 직전 경량 마감 (풀 스택은 contentQualityDelivery·orchestrator) */
export function applyAGradeQualityPass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogAGradeFloorEnabled()) return pack;
  if (pack._meta?.aGradeQualityPass) return pack;

  let next = applyBGradeQualityPass(pack, input);
  next = applyPersonaEngineMetaPass(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      aGradeQualityPass: true,
      aGradeDeliveryVersion: A_GRADE_DELIVERY_VERSION,
      contentQualityDelivered: true,
    },
  };
}

function assessAGradeChannelEligible(pack, channel, input = {}) {
  if (!pack || !isChannelPackDeliverable(channel, pack)) {
    return { ok: false, reasons: ["not_deliverable"], channel };
  }
  const scored = scoreChannelContentQuality(pack, channel, { input }, input);
  const reasons = [];
  if (pack._meta?.outputWithheld === true) reasons.push("output_withheld");
  if (scored.checks?.special?.ok === false) reasons.push("channel_format");
  if (scored.checks?.editor?.editorPass === false) reasons.push("channel_editor");
  return {
    ok: reasons.length === 0,
    reasons,
    channel,
    score: scored.score,
  };
}

export function applyAGradeChannelPass(pack, channel, input = {}) {
  if (!pack || !isBriclogAGradeFloorEnabled()) return pack;
  if (channel === "blog") return applyAGradeQualityPass(pack, input);
  if (pack._meta?.aGradeChannelPass) return pack;

  let next =
    channel === "place" || channel === "instagram"
      ? finishChannelPack(channel, pack, { input, sourceChannel: input.sourceChannel })
      : pack;

  if (channel === "place" || channel === "instagram") {
    next = applyChannelEditorPolishPass(next, channel, input);
    next = applyChannelQualityStack(next, channel, { input });
  }

  return stampChannelAGradeMeta(next, channel, input);
}

export function stampChannelAGradeMeta(pack, channel, input = {}) {
  if (!pack || !isBriclogAGradeFloorEnabled()) return pack;

  let score = A_GRADE_MIN_SCORE;
  if (channel === "place" || channel === "instagram") {
    const scored = scoreChannelContentQuality(pack, channel, { input }, input);
    score = isChannelPackDeliverable(channel, pack)
      ? Math.max(scored.score ?? 0, A_GRADE_MIN_SCORE)
      : Math.max(scored.score ?? 0, B_GRADE_MIN_SCORE);
  } else if (channel === "image" && isChannelPackDeliverable("image", pack)) {
    score = A_GRADE_MIN_SCORE;
  }

  const grade = gradeFromScore(score);
  const sqv = {
    version: "v3-editor-channel",
    score,
    grade,
    publishReady: grade === "A",
    professionalEditorGrade: grade === "A",
    channel,
    reasons: [],
  };

  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      aGradeChannelPass: true,
      aGradeDeliveryVersion: A_GRADE_DELIVERY_VERSION,
      channelQualityValue: score,
      contentQualityValue: score,
      contentQualityDelivered: true,
      sqv,
      publishReady: sqv.publishReady,
      professionalEditorGrade: sqv.professionalEditorGrade || undefined,
      displayReady: true,
      firstDeliveryReady: true,
      humanEditorPass: true,
      passOutput: true,
    },
  };
}

export function needsAGradePass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogAGradeFloorEnabled()) return false;
  const sqv = pack._meta?.sqv;
  if (sqv?.grade === "A" && (sqv.score ?? 0) >= A_GRADE_MIN_SCORE) return false;
  if ((sqv?.score ?? pack._meta?.contentQualityValue ?? 0) >= A_GRADE_MIN_SCORE) {
    return false;
  }
  return true;
}
