import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";

/**
 * V3 2단계 — 지역 분석
 */
export function analyzeRegionV3(input = {}) {
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const industry = String(input.industry || input.industryText || "가구").trim();
  const hints = buildRegionKeywordHints(input);

  const searchIntents = [
    `${region} ${brand}`.trim(),
    `${region} ${industry}`,
    `${region} 매장`,
    `${region} 방문`,
    "신혼·입주·이사 준비",
    "가구·침대 비교",
  ].filter((s) => s.length >= 3);

  const relatedKeywords = [...new Set([...hints, ...searchIntents])].slice(0, 14);

  return {
    regionName: region,
    lifeAreas: hints.filter((h) => h !== region).slice(0, 8),
    searchIntents: relatedKeywords,
    localQueries: relatedKeywords.slice(0, 10),
  };
}

export function formatRegionAnalysisBrief(analysis) {
  if (!analysis?.regionName) return "";
  return [
    "【V3 · 2. 지역 분석】",
    `지역: ${analysis.regionName}`,
    analysis.lifeAreas?.length
      ? `생활권·연관: ${analysis.lifeAreas.join(", ")}`
      : null,
    analysis.searchIntents?.length
      ? `검색 의도·키워드: ${analysis.searchIntents.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
