/**
 * STEP 3 — Industry Lock (다른 업종 표현 혼입 금지)
 */
const CROSS_INDUSTRY_MARKERS = {
  flower: [
    /꽃다발|생화|플라워|화병|리본|꽃집|무인꽃|기념일\s*꽃/,
  ],
  unmanned_flower: [/꽃다발|생화|무인|24\s*시간\s*꽃/],
  cafe: [/에스프레소|라떼|브런치|원두|카페\s*메뉴|테이크아웃\s*커피/],
  hospital: [/진료|의사|검진|처방|내과|외과|클리닉|환자/],
  furniture: [/소파|매트리스|모션\s*베드|모션베드|헤드\s*각도|인테리어\s*쇼룸|가구\s*배송/],
  carwash: [/세차|왁스|코팅|차량\s*관리/],
  academy: [/수업|강사|입시|학원|교육\s*과정/],
  restaurant: [/맛집|메뉴판|예약\s*식당|코스\s*요리/],
  salon: [/펌|염색|네일|헤어\s*디자인/],
  pet: [/반려동물|애견|펫\s*샵|강아지\s*미용/],
  realestate: [/매물|전세|월세|부동산\s*중개/],
  agency: [/캠페인|광고\s*집행|매체\s*운영|퍼포먼스|브랜딩\s*전략|크리에이티브/],
  marketing: [
    /마케팅\s*대행|광고\s*대행|퍼포먼스\s*마케팅|바이럴|매체\s*집행|캠페인\s*기획|크리에이티브\s*제작|브랜딩\s*컨설팅|디지털\s*마케팅|sns\s*운영|인스타\s*광고/,
  ],
  default: [],
};

const ALL_INDUSTRY_KEYS = Object.keys(CROSS_INDUSTRY_MARKERS).filter(
  (k) => k !== "default"
);

/** 동일 계열 업종 — 교차 오염으로 보지 않음 */
const COMPATIBLE_INDUSTRY = {
  flower: ["unmanned_flower"],
  unmanned_flower: ["flower"],
};

export function getLockedIndustryKey(profile = {}, fallbackKey = "default") {
  return profile.industryKey || fallbackKey || "default";
}

export function detectIndustryCrossContamination(text, lockedKey) {
  const t = String(text || "");
  const locked = lockedKey || "default";
  const violations = [];

  for (const key of ALL_INDUSTRY_KEYS) {
    if (key === locked) continue;
    if ((COMPATIBLE_INDUSTRY[locked] || []).includes(key)) continue;
    const patterns = CROSS_INDUSTRY_MARKERS[key] || [];
    for (const re of patterns) {
      if (re.test(t)) {
        violations.push({ foreignIndustry: key, pattern: re.source });
      }
    }
  }

  return {
    ok: violations.length === 0,
    lockedKey: locked,
    violations,
  };
}

export function industryForbiddenPhrases(lockedKey) {
  const forbidden = [];
  for (const key of ALL_INDUSTRY_KEYS) {
    if (key === lockedKey) continue;
    forbidden.push(...(CROSS_INDUSTRY_MARKERS[key] || []));
  }
  return forbidden;
}
