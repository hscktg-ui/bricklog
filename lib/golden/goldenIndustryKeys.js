/**
 * Golden Dataset — 업종 키 SSOT
 */
export const GOLDEN_INDUSTRY_OPTIONS = [
  { value: "flower_shop", label: "꽃집" },
  { value: "cafe", label: "카페" },
  { value: "tea_cafe", label: "티카페" },
  { value: "restaurant", label: "식당" },
  { value: "furniture", label: "가구·침대" },
  { value: "hospital", label: "병원·의원" },
  { value: "academy", label: "학원·교육" },
  { value: "marketing", label: "마케팅·광고" },
  { value: "salon", label: "미용·살롱" },
  { value: "pet", label: "반려동물" },
  { value: "etc", label: "기타" },
];

const ALIAS_TO_GOLDEN = [
  [/꽃|플라워|flower|화환|플로리스트/i, "flower_shop"],
  [/티\s*카페|tea\s*cafe|다실|티하우스/i, "tea_cafe"],
  [/카페|커피|coffee|브런치|베이커리/i, "cafe"],
  [/식당|맛집|restaurant|레스토랑|요리/i, "restaurant"],
  [/가구|침대|매트리스|furniture|쇼룸/i, "furniture"],
  [/병원|의원|clinic|hospital|치과|한의/i, "hospital"],
  [/학원|교육|academy|입시|과외/i, "academy"],
  [/마케팅|광고|marketing|대행|홍보/i, "marketing"],
  [/미용|헤어|네일|살롱|barber/i, "salon"],
  [/반려|애견|펫|pet/i, "pet"],
];

/** @param {object} input */
export function resolveGoldenIndustryKey(input = {}) {
  const explicit = String(input.goldenIndustry || input.golden_industry || "").trim();
  if (explicit && GOLDEN_INDUSTRY_OPTIONS.some((o) => o.value === explicit)) {
    return explicit;
  }

  const blob = [
    input.industry,
    input.industryLabel,
    input.topic,
    input.mainKeyword,
    input.brandName,
    input.brandDescription,
  ]
    .filter(Boolean)
    .join(" ");

  for (const [re, key] of ALIAS_TO_GOLDEN) {
    if (re.test(blob)) return key;
  }
  return "etc";
}

export function goldenIndustryLabel(key) {
  return GOLDEN_INDUSTRY_OPTIONS.find((o) => o.value === key)?.label || key;
}
