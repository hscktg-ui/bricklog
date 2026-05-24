/** 업종 자동완성·빠른 선택 (선택 입력) */

/** 글쓰기 폼에 바로 보이는 대표 업종 (10개) */
export const INDUSTRY_QUICK_PICKS = [
  "카페",
  "꽃집",
  "음식점",
  "미용실",
  "헬스장",
  "병원",
  "부동산",
  "세무사",
  "학원",
  "쇼핑몰",
];

/** 「더 보기」에서만 노출 (스크롤 영역) */
export const INDUSTRY_MORE_PICKS = [
  "공인중개사",
  "건축사",
  "광고대행사",
  "한의원",
  "치과",
  "약국",
  "피부과",
  "편의점",
  "인테리어",
  "법률사무소",
  "변호사",
  "보험",
  "컨설팅",
  "호텔",
  "스튜디오",
];

/** 전체 제안 (API·매칭 호환) */
export const INDUSTRY_AUTOCOMPLETE = [
  ...INDUSTRY_QUICK_PICKS,
  ...INDUSTRY_MORE_PICKS,
];
