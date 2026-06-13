/** 품질 자동 테스트 — 카테고리·화자·감정·목적·채널 */

export const TRAINING_TARGET_DEFAULT = 95;
export const TRAINING_MAX_REWRITES = 5;
export const TRAINING_MAX_GENERATIONS_DEFAULT = 300;
export const TRAINING_MAX_WALL_MS = 10 * 60 * 60 * 1000;
export const TRAINING_CONSECUTIVE_PASS = 20;
export const TRAINING_ERROR_RATE_MAX = 0.1;
/** coreQualityEngine·BLOG_MIN_BODY_CHARS 와 동일 축 — REGIONS 정의 후 re-export (순환 import 방지) */

export const GENERAL_CATEGORIES = [
  "카페",
  "꽃집",
  "음식점",
  "미용실",
  "학원",
  "가구점",
  "인테리어",
  "헬스장",
  "광고대행사",
  "온라인 쇼핑몰",
  "펜션",
  "공방",
];

export const SENSITIVE_CATEGORIES = [
  "병원",
  "약국",
  "법률",
  "세무",
  "노무",
  "부동산",
  "금융",
  "보험",
  "건강기능식품",
];

export const TRAINING_PERSONAS = [
  { label: "브랜드 소개형", v4Speaker: "brand_intro", contentPersona: "brand_story" },
  { label: "방문 후기형", v4Speaker: "real_use", contentPersona: "visit_review" },
  { label: "정보 제공형", v4Speaker: "expert_info", contentPersona: "info_intro" },
  { label: "지역 추천형", v4Speaker: "local_blogger", contentPersona: "local_guide" },
  { label: "매거진형", v4Speaker: "magazine", contentPersona: "info_intro" },
  { label: "담백한 후기형", v4Speaker: "plain_review", contentPersona: "visit_review" },
];

export const TRAINING_EMOTIONS = [
  { label: "담백함", emotionTemperature: "plain", tone: "lifestyle" },
  { label: "따뜻함", emotionTemperature: "warm", tone: "emotional" },
  { label: "신뢰감", emotionTemperature: "trust", tone: "trust" },
  { label: "전문성", emotionTemperature: "pro", tone: "informative" },
  { label: "유쾌함", emotionTemperature: "playful", tone: "lifestyle" },
  { label: "고급스러움", emotionTemperature: "premium", tone: "premium" },
  { label: "차분함", emotionTemperature: "calm", tone: "trust" },
];

export const TRAINING_PURPOSES = [
  { label: "브랜드 소개", purpose: "brand" },
  { label: "상품 소개", purpose: "brand" },
  { label: "신규 오픈", purpose: "newOpen" },
  { label: "이벤트 안내", purpose: "season" },
  { label: "방문 유도", purpose: "visitDrive" },
  { label: "후기형", purpose: "review" },
  { label: "정보형", purpose: "info" },
  { label: "시즌", purpose: "season" },
];

export const TRAINING_CHANNELS = ["blog", "place", "instagram"];

export const REGIONS = [
  "강남",
  "홍대",
  "부산 해운대",
  "대구 수성",
  "인천 송도",
  "제주 연동",
  "광주 상무",
  "대전 둔산",
];

export function getHourlyMaxCalls() {
  return Number(process.env.BRICLOG_QUALITY_TRAINING_HOURLY_MAX) || 120;
}

export function getRunMaxCalls() {
  return (
    Number(process.env.BRICLOG_QUALITY_TRAINING_RUN_MAX) ||
    TRAINING_MAX_GENERATIONS_DEFAULT
  );
}
