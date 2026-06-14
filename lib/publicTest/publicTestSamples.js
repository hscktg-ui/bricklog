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
  {
    id: "pet_groom",
    brandName: "몽글펫",
    region: "서울 성수",
    topic: "반려견 목욕·드라이 예약",
    topicTrait: "반려견 미용",
    industry: "펫샵",
  },
  {
    id: "yoga_today",
    brandName: "요가룸 오늘",
    region: "경기 판교",
    topic: "초보 입문·체험 클래스",
    topicTrait: "초보 체험",
    industry: "요가",
  },
  {
    id: "korean_dining",
    brandName: "기와식당",
    region: "전주 한옥마을",
    topic: "지역 제철 한정 코스",
    topicTrait: "제철 코스",
    industry: "한식",
  },
  {
    id: "nail_room",
    brandName: "네일룸",
    region: "서울 홍대",
    topic: "젤 네일·손톱 케어 상담",
    topicTrait: "손톱 케어",
    industry: "네일",
  },
  {
    id: "w_academy",
    brandName: "더블유학원",
    region: "대구 수성",
    topic: "기말 대비 수학·영어 보강",
    topicTrait: "기말 보강",
    industry: "학원",
  },
  {
    id: "move_heaven",
    brandName: "이사천국",
    region: "수원 영통",
    topic: "원룸·투룸 포장 이사 견적",
    topicTrait: "포장 이사",
    industry: "이사",
  },
  {
    id: "sky_wedding",
    brandName: "하늘예식장",
    region: "부산 기장",
    topic: "봄 웨딩·상담·뷔페 시식",
    topicTrait: "웨딩 상담",
    industry: "웨딩",
  },
  {
    id: "barun_auto",
    brandName: "바른오토",
    region: "인천 계양",
    topic: "정기점검·엔진오일 교환",
    topicTrait: "정기점검",
    industry: "자동차",
  },
  {
    id: "core_pilates",
    brandName: "코어필라",
    region: "서울 목동",
    topic: "재활·체형교정 필라테스 체험",
    topicTrait: "재활 필라테스",
    industry: "필라테스",
  },
];

export const PUBLIC_TEST_SAMPLE_COUNT = PUBLIC_TEST_SAMPLES.length;

export function findPublicTestSampleIndex(sampleId = "") {
  const id = String(sampleId || "").trim();
  if (!id) return -1;
  return PUBLIC_TEST_SAMPLES.findIndex((s) => s.id === id);
}

export function getPublicTestSampleById(sampleId = "") {
  const idx = findPublicTestSampleIndex(sampleId);
  return idx >= 0 ? PUBLIC_TEST_SAMPLES[idx] : null;
}

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
