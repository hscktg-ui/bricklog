/** Self Evolution Lab — 네이버 블로그 품질 연구 (관리자 전용) */

export const LAB_MAX_HOURS_DEFAULT = 4;
export const LAB_MIN_EXPERIMENTS = 100;
export const LAB_MAX_EXPERIMENTS = 500;
export const LAB_TARGET_SCORE = 90;
export const LAB_CONSECUTIVE_PASS = 20;
export const LAB_MAX_REWRITES = 5;
export const LAB_ERROR_RATE_MAX = 0.1;
export const LAB_SAME_ERROR_STOP = 5;

export const LAB_MAX_API_CALLS =
  Number(process.env.BRICLOG_EVOL_MAX_API_CALLS) || 350;
export const LAB_MAX_API_PER_HOUR =
  Number(process.env.BRICLOG_EVOL_MAX_API_PER_HOUR) || 70;

export const LAB_RESEARCH_CATEGORIES = [
  "맛집",
  "카페",
  "꽃집",
  "병원",
  "법률",
  "부동산",
  "인테리어",
  "가구",
  "교육",
  "미용",
  "쇼핑몰",
];

export const LAB_SENSITIVE_CATEGORIES = [
  "병원",
  "약국",
  "법률",
  "부동산",
  "세무",
  "노무",
  "금융",
  "보험",
  "투자",
  "건강기능식품",
];

export const LAB_PERSONAS = [
  { id: "brand_intro", label: "브랜드 소개형" },
  { id: "visit_review", label: "방문 후기형" },
  { id: "info_provider", label: "정보 제공형" },
  { id: "local_pick", label: "지역 추천형" },
  { id: "magazine", label: "매거진형" },
  { id: "plain_review", label: "담백한 후기형" },
];

export const LAB_EMOTIONS = [
  "담백함",
  "따뜻함",
  "신뢰감",
  "전문성",
  "유쾌함",
  "고급스러움",
  "차분함",
];
