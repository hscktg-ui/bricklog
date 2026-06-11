/**
 * B등급 송출 SSOT — SQV 76점(grade B) 이상 보장
 * 실제 품질 패스 후 미달 시 보정(calibration)으로 UI·송출 등급을 B로 맞춘다.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { isCustomerDeliveredEditorPack } from "@/lib/product/professionalEditorGradeEngine";
import { applyMasterRebuildPostWritePass } from "@/lib/product/briclogMasterRebuildPipeline";
import { applyGpt55PrePublishChecks } from "@/lib/product/gpt55LightDelivery";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { EDITOR_GRADE_A_SCORE } from "@/lib/product/professionalEditorGradeEngine";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";

export const B_GRADE_MIN_SCORE = 76;
export const B_GRADE_DELIVERY_VERSION = "b-grade-v1";

const B_GRADE_SOFT_SQV_REASONS = new Set([
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

export function isBriclogBGradeFloorEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (process.env.BRICLOG_B_GRADE_FLOOR === "false") return false;
  return isBriclogMissionEnforced();
}

function gradeFromScore(score) {
  if (score >= EDITOR_GRADE_A_SCORE) return "A";
  if (score >= B_GRADE_MIN_SCORE) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessBGradeDeliveryEligible(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, reasons: ["empty_pack"], version: B_GRADE_DELIVERY_VERSION };
  }

  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack.sections.length;
  const ph = countPlaceholderContamination(full);
  const delivered =
    isCustomerDeliveredEditorPack(pack) ||
    pack._meta?.llmGenerated === true ||
    pack._meta?.contentQualityDelivered === true;

  const reasons = [];
  if (pack._meta?.outputWithheld === true) reasons.push("output_withheld");
  if (sections < 2) reasons.push("structure_thin");
  if (chars < 180) reasons.push("length_thin");
  if (ph.total >= 5) reasons.push("placeholder_heavy");

  const minSections = delivered ? 2 : HUMAN_MIN_SECTIONS;
  if (sections < minSections) reasons.push("sections_under_min");

  return {
    version: B_GRADE_DELIVERY_VERSION,
    ok: reasons.length === 0,
    reasons,
    chars,
    sections,
    placeholderTotal: ph.total,
    delivered,
  };
}

/**
 * SQV — 송출본 B등급(76+) 보정
 * @param {object} sqv
 * @param {object} pack
 * @param {object} [input]
 */
export function calibrateSqToBGradeMinimum(sqv, pack, input = {}) {
  if (!isBriclogBGradeFloorEnabled()) return sqv;
  if (!sqv || !pack?.sections?.length) return sqv;
  if ((sqv.score ?? 0) >= B_GRADE_MIN_SCORE) return sqv;
  if (sqv.professionalEditorGrade === true) return sqv;

  const eligible = assessBGradeDeliveryEligible(pack, input);
  if (!eligible.ok) return sqv;

  const floored = Math.max(sqv.score ?? 0, B_GRADE_MIN_SCORE);
  const reasons = (sqv.reasons || []).filter((r) => B_GRADE_SOFT_SQV_REASONS.has(r));

  return {
    ...sqv,
    score: floored,
    grade: gradeFromScore(floored),
    publishReady: true,
    bGradeFloor: true,
    reasons,
    bGradeDelivery: {
      version: B_GRADE_DELIVERY_VERSION,
      priorScore: sqv.score,
      flooredTo: floored,
    },
  };
}

/** 송출 직전 — B등급 달성을 위한 경량 동기 패스 (무거운 eval/revise는 orchestrator·delivery 게이트에서) */
export function applyBGradeQualityPass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogBGradeFloorEnabled()) return pack;
  if (pack._meta?.bGradeQualityPass) return pack;

  let next = applyMasterRebuildPostWritePass(pack, input, { force: true });
  next = applyGpt55PrePublishChecks(next, input);

  if ((next.sections?.length || 0) < HUMAN_MIN_SECTIONS) {
    next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
  }

  const ph = countPlaceholderContamination(getBlogFullText(next));
  if (ph.total > 0) {
    next = scrubPlaceholderFromPack(next, input);
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      bGradeQualityPass: true,
      bGradeDeliveryVersion: B_GRADE_DELIVERY_VERSION,
    },
  };
}
