/**
 * 가입 전 브랜드 테스트 — 가상 브랜드 예시 (실존·자사명 노출 없음)
 */

/** @typedef {{ id: string, brandName: string, region: string, topic: string, topicTrait?: string, industry?: string }} PublicTestSample */

/** @type {PublicTestSample[]} */
export const PUBLIC_TEST_SAMPLES = [
  {
    id: "cafe_brunch",
    brandName: "모카하우스",
    region: "서울 마포",
    topic: "봄 시즌 수제 브런치 메뉴",
    topicTrait: "수제 브런치",
    industry: "카페",
  },
  {
    id: "flower_gift",
    brandName: "꽃담",
    region: "부산 해운대",
    topic: "어버이날 꽃다발 예약·픽업",
    topicTrait: "어버이날 픽업",
    industry: "꽃집",
  },
  {
    id: "clinic_visit",
    brandName: "마음편한 내과",
    region: "인천 송도",
    topic: "건강검진 첫 방문·공복 안내",
    topicTrait: "첫 방문 안내",
    industry: "의료",
  },
  {
    id: "pension_weekend",
    brandName: "바람언덕 펜션",
    region: "제주 애월",
    topic: "주말 바베큐 패키지 예약",
    topicTrait: "바베큐 패키지",
    industry: "숙박",
  },
  {
    id: "salon_care",
    brandName: "루트앤컷",
    region: "서울 강남",
    topic: "두피 케어·염색 상담 예약",
    topicTrait: "두피 케어",
    industry: "미용실",
  },
  {
    id: "bakery_open",
    brandName: "한올베이커리",
    region: "대전 유성",
    topic: "수제 빵 오픈·당일 픽업",
    topicTrait: "수제 빵",
    industry: "베이커리",
  },
];

export const PUBLIC_TEST_SAMPLE_COUNT = PUBLIC_TEST_SAMPLES.length;

export function getPublicTestSampleByIndex(index = 0) {
  const n = PUBLIC_TEST_SAMPLES.length;
  if (!n) {
    return { brandName: "", region: "", topic: "" };
  }
  const i = ((Number(index) % n) + n) % n;
  return PUBLIC_TEST_SAMPLES[i];
}

/** 스모크·API 기본값 — 첫 번째 가상 샘플 */
export function getDefaultPublicTestSample() {
  return getPublicTestSampleByIndex(0);
}
