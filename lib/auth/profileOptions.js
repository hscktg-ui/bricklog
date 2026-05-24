/** 회원가입·프로필 선택지 (단일 소스) */

export const ROLE_TYPES = [
  { value: "ceo", label: "대표" },
  { value: "marketer", label: "마케터" },
  { value: "brand_manager", label: "브랜드 담당자" },
  { value: "agency", label: "광고대행사" },
  { value: "freelancer", label: "프리랜서" },
  { value: "content", label: "콘텐츠 담당자" },
  { value: "other", label: "기타" },
];

export const PREFERRED_TITLES = [
  { value: "디렉터님", label: "디렉터님" },
  { value: "대표님", label: "대표님" },
  { value: "마케터님", label: "마케터님" },
  { value: "담당자님", label: "담당자님" },
  { value: "작가님", label: "작가님" },
  { value: "사장님", label: "사장님" },
  { value: "custom", label: "직접 입력" },
];

export const BRAND_COUNT_BANDS = [
  { value: "1", label: "1개", numericHint: 1 },
  { value: "2_3", label: "2~3개", numericHint: 3 },
  { value: "4_10", label: "4~10개", numericHint: 7 },
  { value: "10_plus", label: "10개 이상", numericHint: 12 },
  { value: "agency_multi", label: "광고대행사 / 다수 브랜드 관리", numericHint: 20 },
];

export const PRIMARY_USE_CASES = [
  { value: "blog", label: "블로그 작성" },
  { value: "place", label: "스마트플레이스 소식 작성" },
  { value: "instagram", label: "인스타그램 바디 작성" },
  { value: "brand_ops", label: "브랜드 콘텐츠 관리" },
  { value: "agency_work", label: "광고대행사 업무" },
  { value: "multi_brand", label: "여러 브랜드 관리" },
  { value: "image_copy", label: "이미지/카피 제작" },
  { value: "other", label: "기타" },
];

/** @param {string} band */
export function brandCountFromBand(band) {
  const row = BRAND_COUNT_BANDS.find((b) => b.value === band);
  return row?.numericHint ?? null;
}

/** @param {string} value */
export function labelForRole(value) {
  return ROLE_TYPES.find((r) => r.value === value)?.label || "";
}

/** @param {string} value */
export function labelForUseCase(value) {
  return PRIMARY_USE_CASES.find((u) => u.value === value)?.label || "";
}
