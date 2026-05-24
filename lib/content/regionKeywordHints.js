/** 지역 + 업종 맥락 검색·SEO 보조 키워드 (휴리스틱) */

const REGION_EXPANSIONS = {
  파주: ["운정", "파주가구단지", "파주신혼가구", "파주침대", "탄현", "금촌", "운정신도시"],
  운정: ["파주", "운정신도시", "운정가구", "운정침대"],
  수원: ["수원가구", "영통", "광교", "수원침대"],
  일산: ["일산가구", "정발산", "백석", "일산침대"],
  김포: ["김포가구", "구래", "장기", "김포침대"],
  분당: ["분당가구", "서현", "정자", "분당침대"],
  강남: ["강남가구", "역삼", "선릉"],
};

export function buildRegionKeywordHints(input = {}) {
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const industry = String(input.industry || input.industryText || "가구").trim();
  if (!region) return [];

  const hints = new Set([region, `${region} ${brand}`.trim(), `${region}${industry}`]);

  for (const [key, extras] of Object.entries(REGION_EXPANSIONS)) {
    if (region.includes(key)) {
      for (const e of extras) hints.add(e);
      if (brand) hints.add(`${e} ${brand}`);
      hints.add(`${e}${industry}`);
    }
  }

  return [...hints].filter(Boolean).slice(0, 12);
}
