/**
 * 베타여도 고객 화면은 「완성 편집본」 기준 — SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isPublishableBlogPack } from "@/lib/content/outlinePackGuard";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { hasMetaPhilosophyLeak } from "@/lib/content/metaLayerSeparation";
import { isLengthOnlyGateSoft, isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  HUMAN_BELIEF_MIN_SCORE,
  scoreHumanBelief,
} from "@/lib/product/humanBeliefEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { assessFirstDeliveryQuality } from "@/lib/product/firstDeliveryQuality";
import {
  DEEP_LEARNING_MIN_SCORE,
  scoreDeepLearning,
} from "@/lib/product/deepLearningEngine";

/** 완성안(displayReady) 기준 — belief·grounded 포함 */
export const COMPLETION_HARD_FAIL_REASONS = new Set([
  "first_delivery_human_editor",
  "first_delivery_editor_v95",
  "first_delivery_persona",
  "first_delivery_human_belief",
  "human_belief_low",
  "grounded_specificity_low",
  "brochure_voice",
  "ad_smell_high",
  "brand_reintro",
  "internal_prompt_leak",
  "empty_pack",
  "meta_layer_leak",
  "research_facts_thin",
  "v2axis_no_research",
  "v2axis_insufficient_facts",
  "fiction_detected",
  "checklist_voice",
  "checklist_template_high",
  "coverage_slot_dump",
  "confirm_sentence_flood",
  "v2axis_banned_template",
]);

/** 미리보기조차 금지 — 정식 오픈: 첫 노출 품질·belief 미달도 차단 */
export const PREVIEW_WITHHOLD_REASONS = new Set([
  "checklist_voice",
  "checklist_template_high",
  "coverage_slot_dump",
  "confirm_sentence_flood",
  "internal_prompt_leak",
  "empty_pack",
  "meta_layer_leak",
  "research_facts_thin",
  "v2axis_no_research",
  "v2axis_insufficient_facts",
  "fiction_detected",
  "v2axis_banned_template",
  "post_write_quality_failed",
  "human_belief_low",
  "grounded_specificity_low",
  "first_delivery_human_editor",
  "first_delivery_editor_v95",
  "first_delivery_persona",
  "first_delivery_human_belief",
  "human_editor_fail",
  "content_quality_fail",
  "deep_learning_below_min",
  "forbidden_surface",
]);

export const COMPLETION_READY_HINT =
  "편집본이 준비됐어요. 확인·수정한 뒤 발행하시면 됩니다.";

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ reasons?: string[], failReasons?: string[] }} [gate]
 */
export function assessCompletionReadiness(pack, input = {}, gate = {}) {
  const reasons = [];
  if (!pack?.sections?.length || pack.sections.length < 3) {
    reasons.push("not_publishable");
  }
  const substantive = (pack?.sections || []).filter((s) =>
    isSubstantiveSectionBody(s?.body)
  ).length;
  if (substantive < 3) reasons.push("not_publishable");

  if (!isPublishableBlogPack(pack)) reasons.push("outline_only_output");

  const full = getBlogFullText(pack);
  if (hasMetaPhilosophyLeak(full, input)) reasons.push("meta_layer_leak");

  if (!isLengthOnlyGateSoft()) {
    const length = assertBlogLengthTier(input, pack);
    if (!length.ok) reasons.push(...(length.reasons || []));
  }

  const hbMeta = pack?._meta?.humanBelief;
  const belief =
    hbMeta?.score != null
      ? {
          ok: hbMeta.ok !== false && (hbMeta.score ?? 0) >= HUMAN_BELIEF_MIN_SCORE,
          score: hbMeta.score,
          issues: hbMeta.issues || [],
        }
      : scoreHumanBelief(full, input);

  if (isBriclogMissionEnforced() && !belief.ok) {
    reasons.push("human_belief_low");
  }

  const checklist = scoreChecklistVoice(full, pack);
  if (isBriclogMissionEnforced() && !checklist.ok) {
    for (const r of checklist.issues) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const grounded =
    hbMeta?.grounded ||
    scoreGroundedSpecificity(pack, { input, ...input }, input.researchFacts);
  const factCount = (input.researchFacts || []).length;
  if (isBriclogMissionEnforced() && factCount >= 2 && !grounded.ok) {
    reasons.push("grounded_specificity_low");
  }

  const firstDelivery = assessFirstDeliveryQuality(pack, input);
  if (isBriclogMissionEnforced() && !firstDelivery.displayReady) {
    for (const r of firstDelivery.reasons) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const gateReasons = [
    ...(gate.reasons || []),
    ...(gate.failReasons || []),
  ];
  for (const r of gateReasons) {
    if (COMPLETION_HARD_FAIL_REASONS.has(r) && !reasons.includes(r)) {
      reasons.push(r);
    }
  }

  if (isBriclogMissionEnforced()) {
    const dl = scoreDeepLearning(pack, input);
    if (dl.forbiddenHits > 0) reasons.push("forbidden_surface");
    if (dl.total < DEEP_LEARNING_MIN_SCORE) reasons.push("deep_learning_below_min");
  }

  const hardBlock = reasons.some((r) => COMPLETION_HARD_FAIL_REASONS.has(r));
  const displayReady = reasons.length === 0;
  const completeDraft = displayReady;

  return {
    displayReady,
    completeDraft,
    hardBlock,
    reasons: [...new Set(reasons)],
    humanBelief: belief,
    grounded,
  };
}

/** 화면에 올린 본문이면 고객에게는 「완성 편집본」으로 취급 (내부 점수 미달과 분리) */
export function isUserPresentableDraft(pack, input = {}, gate = {}) {
  if (!pack?.sections?.length || pack.sections.length < 3) return false;
  if (isPreviewWithholdFailure(gate, pack, input)) return false;
  const previewable = countPreviewableSections(pack);
  if (previewable < 2) return false;
  const full = getBlogFullText(pack);
  if (!full || full.replace(/\s/g, "").length < 320) return false;
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  return Boolean(brand && region && topic);
}

export function isCompletionHardFailure(gate = {}, pack = null, input = {}) {
  if (pack && isBriclogMissionEnforced()) {
    const reasons = assessCompletionReadiness(pack, input, gate).reasons.filter(
      (r) => !(r === "empty_pack" && pack?.sections?.length)
    );
    return reasons.some((r) => COMPLETION_HARD_FAIL_REASONS.has(r));
  }
  const reasons = [
    ...(gate.reasons || []),
    ...(gate.failReasons || []),
  ].filter((r) => !(r === "empty_pack" && pack?.sections?.length));
  return reasons.some((r) => COMPLETION_HARD_FAIL_REASONS.has(r));
}

export function countPreviewableSections(pack) {
  return (pack?.sections || []).filter((s) => {
    const body = String(s?.body || "").trim();
    if (!body || body.replace(/\s/g, "").length < 35) return false;
    return isSubstantiveSectionBody(body, 2, 35) || body.length >= 50;
  }).length;
}

/** 본문이 있으면 화면에 올림 — 유출·허구만 미리보기 차단 */
const CRITICAL_PREVIEW_ONLY = new Set([
  "internal_prompt_leak",
  "meta_layer_leak",
  "fiction_detected",
  "v2axis_banned_template",
  "empty_pack",
]);

export function isPreviewWithholdFailure(gate = {}, pack = null, input = {}) {
  if (pack?.sections?.length) {
    const reasons = [
      ...(gate.reasons || []),
      ...(gate.failReasons || []),
    ];
    const substantiveSections = (pack.sections || []).filter((s) =>
      String(s?.body || "").trim().replace(/\s/g, "").length >= 35
    ).length;
    if (substantiveSections >= 3 || pack.sections.length >= 3) {
      return reasons.some((r) => CRITICAL_PREVIEW_ONLY.has(r));
    }
    const previewable = countPreviewableSections(pack);
    const minPreviewable = isBriclogMissionEnforced() ? 2 : 3;
    if (previewable >= minPreviewable) {
      return reasons.some((r) => CRITICAL_PREVIEW_ONLY.has(r));
    }
    if (previewable < minPreviewable) return true;
  }
  const reasons = [
    ...(gate.reasons || []),
    ...(gate.failReasons || []),
  ].filter((r) => !(r === "empty_pack" && pack?.sections?.length));
  return reasons.some((r) => PREVIEW_WITHHOLD_REASONS.has(r));
}
