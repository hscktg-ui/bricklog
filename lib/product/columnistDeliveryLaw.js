/**
 * Columnist Delivery Law — 절대불변 송출 법칙
 * 조사가 있는데 템플릿·엔진 스팸·지역붙임이 고객 UI에 나가면 실패.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import { assessPackRegionBrandMash } from "@/lib/content/regionBrandMashRepair";
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";
import { assessGenerationAxisAlignment } from "@/lib/product/generationAxisAlignGate";
import { resolveVisitReviewIntentInput } from "@/lib/content/topicFacetEngine";
import { hasEngineSpamInText } from "@/lib/product/columnistEngineSpam";

export const COLUMNIST_DELIVERY_LAW_VERSION = "columnist-delivery-law-v1";

export function isColumnistSovereignPack(pack) {
  return Boolean(
    pack?._meta?.columnistSovereignLlm ||
      pack?._meta?.visitReviewSovereignLlm ||
      pack?._meta?.generationMode === "columnist_sovereign" ||
      pack?._meta?.generationMode === "visit_review_sovereign"
  );
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assertColumnistDeliveryLaw(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, shouldWithhold: true, reason: "empty_pack", violations: [] };
  }

  const full = getBlogFullText(pack);
  const intentInput = resolveVisitReviewIntentInput(input, pack);

  const axisAlign = assessGenerationAxisAlignment(intentInput);
  if (!axisAlign.ok) {
    return {
      ok: false,
      shouldWithhold: true,
      reason: axisAlign.reason,
      violations: [{ type: axisAlign.reason, hints: axisAlign.hints }],
      version: COLUMNIST_DELIVERY_LAW_VERSION,
    };
  }

  if (isColumnistSovereignPack(pack)) {
    const mash = assessPackRegionBrandMash(pack, intentInput, "blog");
    if (!hasEngineSpamInText(full) && mash.ok) {
      return { ok: true, shouldWithhold: false, reason: null, violations: [] };
    }
  }

  const violations = [];

  if (hasEngineSpamInText(full)) {
    violations.push({ type: "engine_spam" });
  }

  const mash = assessPackRegionBrandMash(pack, intentInput, "blog");
  if (!mash.ok) {
    violations.push({ type: "region_brand_mash", issues: mash.issues?.slice(0, 3) });
  }

  const contam = detectVisitReviewTemplateContamination(pack, intentInput);
  if (!contam.ok) {
    violations.push({ type: "template_contamination", detail: contam.violations?.slice(0, 3) });
  }

  const hasResearch = hasUsableResearchFacts(intentInput);
  const openai = isOpenAIConfigured();
  if (
    hasResearch &&
    openai &&
    isMissionFallbackPack(pack, intentInput) &&
    process.env.BRICLOG_COLUMNIST_SOVEREIGN !== "false"
  ) {
    violations.push({ type: "mission_template_with_research" });
  }

  if (
    hasResearch &&
    openai &&
    !isColumnistSovereignPack(pack) &&
    process.env.BRICLOG_COLUMNIST_SOVEREIGN !== "false"
  ) {
    violations.push({ type: "non_sovereign_research_delivery" });
  }

  const hardBlock = violations.some((v) =>
    [
      "engine_spam",
      "region_brand_mash",
      "mission_template_with_research",
      "non_sovereign_research_delivery",
      "mission_template_with_research",
      "topic_food_brand_furniture_mismatch",
      "topic_furniture_brand_food_mismatch",
      "cross_brand_topic_leak",
    ].includes(v.type)
  );

  return {
    ok: violations.length === 0,
    shouldWithhold: hardBlock,
    reason: violations[0]?.type || null,
    violations,
    version: COLUMNIST_DELIVERY_LAW_VERSION,
  };
}

export function buildColumnistWithholdMessage(input = {}) {
  const brand = String(input.brandName || "매장").trim();
  return `${brand} 조사는 반영됐지만, 이번 초안이 칼럼니스트 품질 기준에 못 미쳐요. 「다시 받기」를 눌러 주세요.`;
}
