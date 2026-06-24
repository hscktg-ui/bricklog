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

  if (isColumnistSovereignPack(pack)) {
    return { ok: true, shouldWithhold: false, reason: null, violations: [] };
  }

  const full = getBlogFullText(pack);
  const violations = [];
  const intentInput = resolveVisitReviewIntentInput(input, pack);

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

  const hardBlock = violations.some((v) =>
    ["engine_spam", "region_brand_mash", "mission_template_with_research"].includes(v.type)
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
