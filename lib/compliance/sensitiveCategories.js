/**
 * 민감 업종 레지스트리 — 법·의료·약국·부동산·금융 등
 * 실시간 법령 DB가 아닌 보수적 정적 가드레일 (최신 법령은 전문가 확인 필요)
 */

/** @typedef {'legal'|'medical'|'pharmacy'|'real_estate'|'financial'|'tax'} SensitiveType */

export const SENSITIVE_TYPE_LABELS = {
  legal: "법률·법무",
  medical: "의료·건강",
  pharmacy: "약국·의약",
  real_estate: "부동산",
  financial: "금융·보험",
  tax: "세무·회계",
};

/** 업종 키워드 → 민감 유형 (복수 매칭 가능) */
const INDUSTRY_MATCHERS = [
  {
    type: "legal",
    re: /법률|법무|변호|법원|소송|법률사무|로펌|법무사|legal/i,
  },
  {
    type: "medical",
    re: /병원|의원|한의|치과|피부과|성형|의료|진료|클리닉|검진|수술|치료원|재활|산부|소아과|내과|외과|정형|안과|이비인후/i,
  },
  {
    type: "pharmacy",
    re: /약국|약사|처방전|의약품|한약방|조제/i,
  },
  {
    type: "real_estate",
    re: /부동산|공인중개|중개사|매물|분양|임대|전세|월세|아파트\s*분양|빌라\s*분양/i,
  },
  {
    type: "financial",
    re: /보험|대출|투자|펀드|증권|금융|자산관리|재테크|연금(?!상품\s*만)/i,
  },
  {
    type: "tax",
    re: /세무|회계|세금\s*환급|조세|국세|지방세/i,
  },
];

/** 브랜드 유형 보조 힌트 */
const BRAND_TYPE_HINTS = {
  professional: ["legal", "tax", "medical", "financial"],
};

/** 유형별 한국 법령·광고 가이드 (정적, 비실시간) */
export const LAW_GUARDRAILS = {
  legal: [
    "변호사·법무 관련 표현은 변호사법·광고 규정을 고려해, 승소·무조건 해결 등 단정적 약속을 피합니다.",
    "구체 사건에 대한 법률 자문·판단은 글에서 하지 않고, 전문 상담을 권합니다.",
  ],
  medical: [
    "의료광고 관련 규정을 고려해, 완치·치료 보장·부작용 없음·100% 효과 등 과장 표현을 금합니다.",
    "진단·처방·특정 시술 효능을 단정하지 않고, 의료진 상담·내원 확인을 안내합니다.",
  ],
  pharmacy: [
    "약사법·의약품 광고 관련 규정을 고려해, 특정 의약품명·처방·복용법을 권유하지 않습니다.",
    "약 효능·치료 효과를 단정하지 않고, 약사·의료 전문가 확인을 권합니다.",
  ],
  real_estate: [
    "공인중개사법·부동산 광고 관련 규정을 고려해, 수익·가격 상승·확정 매칭 등 단정 표현을 피합니다.",
    "매물·가격·계약 조건은 현장·등기·공식 안내로 확인하도록 안내합니다.",
  ],
  financial: [
    "금융소비자보호법·보험·투자 광고 관련 규정을 고려해, 수익 보장·원금 보장·최고 수익 등 표현을 금합니다.",
    "상품·수익률·세제는 개인별로 다르며, 금융 전문가·공식 자료 확인이 필요함을 안내합니다.",
  ],
  tax: [
    "세무·절세 관련 표현은 개인·사업자별로 달라, 일률적 절세·환급 보장을 하지 않습니다.",
    "세무사·국세청 등 공식 확인을 권합니다.",
  ],
};

const DEFAULT_DISCLAIMER =
  "본 가이드는 작성 보조용이며 최신 법령·행정 해석을 실시간 반영하지 않습니다. 게시 전 해당 분야 전문가·관할 기관 확인이 필요합니다.";

/**
 * @param {Object} input brandType, industry, industryText, industryLabel, businessType
 */
export function resolveSensitiveCompliance(input = {}) {
  const industryBlob = [
    input.industryText,
    input.industry,
    input.industryLabel,
    input.topic,
    input.mainKeyword,
  ]
    .filter(Boolean)
    .join(" ");

  const types = new Set();
  for (const { type, re } of INDUSTRY_MATCHERS) {
    if (re.test(industryBlob)) types.add(type);
  }

  const brandType = input.brandType || "";
  if (brandType === "professional" && types.size === 0) {
    for (const t of BRAND_TYPE_HINTS.professional) types.add(t);
  }

  const typeList = [...types];
  const isSensitive = typeList.length > 0;

  const lawReminders = [];
  for (const t of typeList) {
    lawReminders.push(...(LAW_GUARDRAILS[t] || []));
  }

  const label =
    typeList.length === 0
      ? null
      : typeList.map((t) => SENSITIVE_TYPE_LABELS[t] || t).join(" · ");

  return {
    isSensitive,
    types: typeList,
    label,
    requiresExtendedValidation: isSensitive,
    slowPath: isSensitive,
    noAbsoluteClaims: isSensitive,
    lawReminders: [...new Set(lawReminders)],
    disclaimer: isSensitive ? DEFAULT_DISCLAIMER : null,
    userBadge:
      isSensitive
        ? "법·의료 정보는 반드시 전문가 확인"
        : null,
  };
}

export function isSensitiveIndustryInput(input) {
  return resolveSensitiveCompliance(input).isSensitive;
}
