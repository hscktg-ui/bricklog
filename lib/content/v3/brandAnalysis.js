import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";

/**
 * V3 1단계 — 브랜드 분석
 */
export function analyzeBrandV3(input = {}, brandResearch = null) {
  const brand = String(input.brandName || "").trim();
  const engine = brandResearch || runBrandResearchEngine(input);
  const summary = engine?.summary || {};

  const representativeProducts = [
    input.v2ProductName,
    input.topic,
    input.mainKeyword,
    ...(summary.mainKeywords || []),
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  const keywords = [
    brand,
    `${brand} ${input.region || ""}`.trim(),
    ...(summary.mainKeywords || []),
    ...(summary.coreStrengths || []).slice(0, 3),
  ]
    .map((s) => String(s).trim())
    .filter((s) => s.length >= 2);

  return {
    brandName: brand,
    features: summary.coreStrengths || summary.brandTraits || [],
    representativeProducts: [...new Set(representativeProducts)],
    position: summary.uniqueness || "",
    philosophy:
      input.brandDescription ||
      input.storeFeatures ||
      summary.operationStyle ||
      "",
    targetAudience:
      input.instaAudience ||
      summary.customerInterests?.join(" · ") ||
      "지역·제품 관심 방문·구매 고객",
    keywords: [...new Set(keywords)].slice(0, 12),
    sourceStatus: engine?.sourceStatus || "brand_engine",
  };
}

export function formatBrandAnalysisBrief(analysis) {
  if (!analysis?.brandName) return "";
  return [
    "【V3 · 1. 브랜드 분석】",
    `브랜드: ${analysis.brandName}`,
    analysis.position ? `포지션: ${analysis.position}` : null,
    analysis.features?.length
      ? `특징: ${analysis.features.join(" · ")}`
      : null,
    analysis.representativeProducts?.length
      ? `대표 제품·주제: ${analysis.representativeProducts.join(" · ")}`
      : null,
    analysis.philosophy ? `철학·운영: ${analysis.philosophy}` : null,
    `주요 고객층: ${analysis.targetAudience}`,
    analysis.keywords?.length
      ? `대표 키워드: ${analysis.keywords.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
