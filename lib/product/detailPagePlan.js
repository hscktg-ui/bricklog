/**
 * 상세 기획안 SSOT. 이미지 생성 전에 먼저 만든다.
 * 카테고리마다 섹션 목적이 다르다. 통이미지 one-shot이 아니다.
 * LLM 추가 라운드 없이 카테고리 분석·랭킹 순서로 확정한다(2분 SLA).
 */
import { resolveDetailPageLength } from "@/lib/product/detailPageCatalog";
import { buildDetailPageCategoryListing } from "@/lib/product/detailPageCategoryFlow";
import { DETAIL_PAGE_RANKING_SEQUENCE } from "@/lib/product/detailPageRankingPlaybook";
import { pickDetailPageAsset } from "@/lib/product/detailPageAssets";

export const DETAIL_PAGE_PLAN_VERSION = "detail-plan-v1";

export const DETAIL_PAGE_SALES_ARCHETYPES = Object.freeze({
  grocery: "ingredient_trust",
  restaurant: "ingredient_trust",
  cafe: "ingredient_trust",
  furniture: "technical_authority",
  salon: "problem_solution",
  default: "problem_solution",
});

/** 문법은 템플릿 복제가 아니라, 엔진이 고르는 조립 방식. */
export const DETAIL_PAGE_COMPOSITIONS = Object.freeze({
  hero: "H02-image-then-nameplate",
  intent: "P02-question-stack",
  explain: "E02-quiet-board",
  usp: "F02-hanging-facts",
  observe: "O02-bleed-quote",
  feature: "F04-inset-crop",
  scene: "U02-type-wide",
  spec: "S02-spec-only",
  brand: "B02-brand-quiet",
  cta: "C02-price-bar",
  notice: "N02-dispatch",
});

function imageRequirement(sectionType, assets = []) {
  if (sectionType === "hero") {
    const original = pickDetailPageAsset(assets, ["packshot", "front", "package"]);
    return {
      type: original ? "original" : "generated_packshot",
      preserveProduct: true,
      negativeSpace: "bottom",
      subjectPosition: "center",
      productAssetId: original ? "packshot" : null,
    };
  }
  if (sectionType === "observe" || sectionType === "feature") {
    const original = pickDetailPageAsset(assets, ["detail", "packshot", "front"]);
    return {
      type: original ? "original" : "crop",
      preserveProduct: true,
      negativeSpace: "none",
      subjectPosition: "center",
    };
  }
  if (sectionType === "scene") {
    const original = pickDetailPageAsset(assets, ["usage"]);
    return {
      type: original ? "original" : "none",
      preserveProduct: true,
      negativeSpace: "none",
    };
  }
  return { type: "none", preserveProduct: true, negativeSpace: "none" };
}

export function analyzeDetailPageProduct(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  const objections = String(input.searchIntent || "")
    .trim()
    .slice(0, 80);
  return {
    category: listing.key,
    archetype: DETAIL_PAGE_SALES_ARCHETYPES[listing.key] || DETAIL_PAGE_SALES_ARCHETYPES.default,
    buyer: {
      primaryTarget: input.target || "",
      objections: objections ? [objections] : [],
      needs: listing.filled.slice(0, 3).map((s) => s.label),
    },
    sellingPoints: listing.filled.slice(0, 5).map((s, i) => ({
      title: s.label,
      evidence: s.value,
      priority: i + 1,
    })),
    prohibitedClaims: listing.doNotInvent || [],
    visualKeywords: ["catalog", "product only", "no overlay copy"],
  };
}

export function buildDetailPagePlan(input = {}, assets = []) {
  const listing = buildDetailPageCategoryListing(input);
  const intelligence = analyzeDetailPageProduct(input);
  const length = resolveDetailPageLength(input.pageLength);
  const sections = length.sectionIds.map((type) => {
    const rank = DETAIL_PAGE_RANKING_SEQUENCE.find((s) => s.slot === type);
    return {
      id: type,
      role: type,
      they: rank?.they || type,
      we: rank?.we || type,
      composition: DETAIL_PAGE_COMPOSITIONS[type] || "U01-type-only",
      imageRequirement: imageRequirement(type, assets),
    };
  });
  return {
    version: DETAIL_PAGE_PLAN_VERSION,
    ok: sections[0]?.id === "hero" && sections[sections.length - 1]?.id === "cta",
    archetype: intelligence.archetype,
    category: listing.key,
    order: listing.textFlow,
    intelligence,
    sections,
  };
}

export function detailPageGenerateSlots(plan) {
  return (plan?.sections || [])
    .filter((s) => s.imageRequirement?.type === "generated_packshot")
    .map((s) => s.id);
}
