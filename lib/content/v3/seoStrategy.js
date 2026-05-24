/**
 * V3 7단계 — SEO 전략 (작성 전)
 */
export function buildSeoStrategyV3(input = {}, brandAnalysis, regionAnalysis, topicAnalysis) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const product = String(topicAnalysis?.productName || input.topic || "").trim();
  const industry = String(input.industry || input.industryText || "").trim();

  const mainKeywords = [
    product,
    `${region} ${brand}`.trim(),
    `${region} ${industry}`.trim(),
    brand,
    region,
  ].filter((s) => s.length >= 2);

  const subKeywords = [
    ...(regionAnalysis?.localQueries || []).slice(0, 6),
    ...(brandAnalysis?.keywords || []).slice(0, 4),
    ...(topicAnalysis?.features || []).slice(0, 3),
  ].map(String).filter((s) => s.length >= 2);

  const related = [...new Set([...mainKeywords, ...subKeywords])].slice(0, 16);

  const searchIntents = [
    `${product} 특징·차별점`,
    `${region} ${brand} 매장·방문`,
    `${region} ${industry} 비교·선택`,
    "신규 출시·입주·교체 타이밍",
  ].filter(Boolean);

  return {
    mainKeyword: mainKeywords[0] || product,
    mainKeywords: [...new Set(mainKeywords)].slice(0, 5),
    subKeywords: [...new Set(subKeywords)].slice(0, 10),
    relatedKeywords: related,
    searchIntents,
    placement: "제목·첫 문단·소제목 2곳·마무리에 브랜드·지역·제품 각각 자연 반영",
  };
}

export function formatSeoStrategyBrief(seo) {
  return [
    "【V3 · 7. SEO 전략 (작성 전)】",
    `메인: ${seo.mainKeywords?.join(" · ") || seo.mainKeyword}`,
    `서브: ${seo.subKeywords?.join(" · ") || "-"}`,
    `연관: ${seo.relatedKeywords?.slice(0, 8).join(" · ") || "-"}`,
    `검색 의도: ${seo.searchIntents?.join(" · ") || "-"}`,
    `배치: ${seo.placement}`,
  ].join("\n");
}
