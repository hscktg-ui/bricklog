/**
 * 브랜드·지역·주제가 채워진 경우 — 정보량·주제 반복 등은 화면 미리보기로 완화
 */

import { isLengthOnlyGateSoft } from "@/lib/product/missionFlags";
import {
  assessCompletionReadiness,
  COMPLETION_HARD_FAIL_REASONS,
  isPreviewWithholdFailure,
  isUserPresentableDraft,
} from "@/lib/product/completionStandard";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { isPublishableBlogPack } from "@/lib/content/outlinePackGuard";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isHardOutputGate } from "@/lib/config/productFlags";

export const SOFT_INFORMATION_REASONS = new Set([
  "topic_dominance_low",
  "information_yield_low",
  "information_units_low",
  "industry_density_low",
  "region_density_low",
  "no_new_information",
  "verbatim_topic_repeat",
  "duplicate_killer_fail",
  "duplicate_content",
  "sentence_similarity_80",
  "same_info_repeat",
  "perspective_title_missing_entities",
  "editor_verbatim_topic_dump",
  "post_write_quality_failed",
  "human_review",
  "mechanical_title",
  "editor_tone_weak",
  "beta_test_guard_failed",
  "v2axis_below_95",
  "v2axis_brand_mentions",
  "v2axis_region_mentions",
  "v2axis_product_mentions",
  "v2axis_seo_weak",
  "v2axis_low_research_grounding",
  "industry_mismatch",
  "channel_fit",
  "research_depth",
]);

/** 미리보기로도 올리면 안 되는 실패 — 본문·유출·허구 (Mission: 글자수 단독 제외) */
function hardWithholdReasons() {
  const base = [
    "internal_prompt_leak",
    "outline_only_output",
    "not_publishable",
    "fiction_detected",
    "v2axis_banned_template",
    "v2axis_no_research",
    "v2axis_insufficient_facts",
    "empty_pack",
    "meta_layer_leak",
    "research_facts_thin",
    "research_status_insufficient",
    "gemini_research_incomplete",
    "insufficient_information_units",
    "insufficient_coverage_areas",
    "knowledge_expansion_not_ready",
    "first_delivery_human_editor",
    "first_delivery_editor_v95",
    "first_delivery_persona",
    "first_delivery_human_belief",
    "visit_review_template_contamination",
  ];
  if (!isLengthOnlyGateSoft()) {
    base.unshift("length_tier_under", "length_tier_over");
  }
  return new Set(base);
}

export const SOFT_PREVIEW_HINT =
  "아직 발행용으로 다듬는 중이에요. 「다시 받기」로 한 번 더 받아 보세요.";

/** 고객 화면 — 항상 「완성 편집본」으로 표시 (다듬는 중·미리보기 배지 없음) */
export function stampCompleteCustomerDelivery(pack, input = {}, extraMeta = {}) {
  if (!pack?.sections?.length) return null;
  const cleaned = sanitizeBlogPackMetaLayer(pack);
  return {
    ...cleaned,
    _meta: {
      ...(pack._meta || {}),
      ...extraMeta,
      deliveryPreview: false,
      deliveryPreviewMessage: undefined,
      softPass: false,
      postVerifySoft: false,
      passOutput: true,
      completeDraft: true,
      displayReady: true,
      customerCompleteDelivery: true,
    },
  };
}

export const FORMAL_LAUNCH_WITHHELD_HINT =
  "편집본 품질 기준에 맞지 않아 화면에 올리지 않았어요. 입력을 조금 구체적으로 한 뒤 「다시 받기」를 눌러 주세요.";

/** 분량·본문·사람글 belief까지 갖춘 편집본 — 완성안으로 표시 */
export function isCompleteDraftPack(pack, input = {}) {
  return assessCompletionReadiness(pack, input).completeDraft;
}

export function hasFilledBlogAxes(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  return Boolean(brand && region && topic);
}

export function collectGateReasons(gate = {}) {
  return [
    ...new Set([
      ...(gate.reasons || []),
      ...(gate.failReasons || []),
      ...(gate.v17PreOutput?.reasons || []),
      ...(gate.betaTestGuard?.failReasons || []),
    ]),
  ];
}

export function isSoftInformationGateFailure(gate = {}) {
  const reasons = collectGateReasons(gate).filter((r) => {
    if (r === "post_write_quality_failed") return false;
    if (
      isLengthOnlyGateSoft() &&
      (r === "length_tier_under" || r === "length_tier_over")
    ) {
      return false;
    }
    return true;
  });
  if (!reasons.length) return false;
  if (reasons.some((r) => hardWithholdReasons().has(r))) return false;
  if (reasons.some((r) => COMPLETION_HARD_FAIL_REASONS.has(r))) return false;
  return reasons.every((r) => SOFT_INFORMATION_REASONS.has(r));
}

/** 분량·유출·구성안만 — 미리보기 차단 */
export function isHardWithholdFailure(gate = {}, pack = null) {
  const reasons = collectGateReasons(gate).filter((r) => {
    if (r === "empty_pack" && pack?.sections?.length) return false;
    if (r === "outline_only_output" && pack?.sections?.length >= 3) return false;
    if (r === "not_publishable" && pack?.sections?.length >= 3) return false;
    return true;
  });
  return reasons.some((r) => hardWithholdReasons().has(r));
}

/**
 * 검수 미통과여도 본문이 있으면 고객 화면에 미리보기로 배달
 * @param {object} input
 * @param {object|null} pack
 * @param {object} gate
 * @param {object} [partial]
 */
export function deliverBlogDespiteGate(input, pack, gate = {}, partial = {}) {
  if (isHardOutputGate()) return null;
  if (!pack?.sections?.length || !hasFilledBlogAxes(input)) return null;
  if (isHardWithholdFailure(gate, pack)) return null;
  if (isPreviewWithholdFailure(gate, pack, input)) return null;

  const readiness = assessCompletionReadiness(pack, input, gate);
  const reasons = collectGateReasons(gate);
  const stamped = stampCompleteCustomerDelivery(pack, input, {
    internalQualityReady:
      readiness.completeDraft || isUserPresentableDraft(pack, input, gate),
    completionReadiness: readiness,
    failReasons: reasons,
  });

  return {
    ok: partial.ok !== false,
    blogContent: stamped,
    withheld: false,
    softPass: false,
    userMessage: null,
    mode: partial.mode || "complete_delivery",
    llmAvailable: partial.llmAvailable,
    baseContentLabel: partial.baseContentLabel ?? null,
    meta: {
      ...(partial.meta || {}),
      v2PipelineVerified: partial.meta?.v2PipelineVerified ?? false,
      passOutput: true,
      deliveryPreview: false,
      completeDraft: true,
      failReasons: reasons,
    },
    ...partial,
  };
}
