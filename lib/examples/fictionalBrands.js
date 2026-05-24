/**
 * UI·데모·온보딩용 가상 브랜드만 정의합니다.
 * 실제 거래처·유명 상표명은 넣지 않습니다.
 */

/** 데모 워크스페이스 시드 (importDemoSampleBrands) */
export const FICTIONAL_DEMO_SEED_BRANDS = [
  {
    brandName: "달빛꽃상자",
    region: "성남 판교",
    mainKeyword: "판교 꽃집",
    industry: "flower",
  },
  {
    brandName: "꿈잠매트리스 연구소",
    region: "서울 서초",
    mainKeyword: "서초 매트리스",
    industry: "furniture",
  },
  {
    brandName: "맑은물세탁",
    region: "경기 고양",
    mainKeyword: "고양 세탁",
  },
  {
    brandName: "편안침대 하우스",
    region: "경기 수원",
    mainKeyword: "수원 침대",
    industry: "furniture",
  },
];

/**
 * 생성 결과에서 제거할 실제 거래처·구 예시 상표 (사용자 입력이 아닐 때)
 */
export const LEGACY_CLIENT_BRAND_NAMES = [
  "그랩앤고플라워",
  "그랩앤고",
  "grab n go",
  "템퍼",
  "tempur",
  "라라워시",
  "lalawash",
  "에이스침대",
  "브릭플라워",
  "운정꽃집",
  "골프존",
];

/** 브랜드명 기반 특성 추론 — 가상 예시 브랜드에만 매칭 */
export const FICTIONAL_BRAND_NAME_PROFILES = [
  {
    match: /달빛꽃상자|달빛꽃/i,
    industry: "flower",
    tone: "lifestyle",
    kpiGoal: "save",
    brandMood: "담백·생활 속 꽃",
    writingStyle: "short-warm",
    sentenceLength: "short",
    emojiLevel: "low",
    brandDescription:
      "동네 꽃집, 당일 픽업·기념일 꽃다발, 부담 없는 꽃 선물",
    includePhrases: "당일 픽업, 생화 꽃다발, 기념일 꽃, 리본 포장",
    instagramMood: "save-life",
    placeStyle: "ops-notice",
    blogStyle: "stay-read",
  },
  {
    match: /꿈잠매트리스/i,
    industry: "furniture",
    tone: "premium",
    kpiGoal: "reservation",
    brandMood: "프리미엄·수면",
    writingStyle: "long-premium",
    sentenceLength: "long",
    emojiLevel: "none",
    brandDescription: "프리미엄 매트리스·수면 상담, 방문 예약 중심",
    excludePhrases: "저렴한, 최저가",
    instagramMood: "premium-calm",
    placeStyle: "visit-book",
    blogStyle: "trust-detail",
  },
  {
    match: /맑은물세탁/i,
    industry: "default",
    tone: "informative",
    kpiGoal: "search",
    brandMood: "실무·운영",
    writingStyle: "info-direct",
    sentenceLength: "medium",
    emojiLevel: "low",
    brandDescription: "세탁·케어 운영 정보, 이용 방법 안내",
    instagramMood: "info-save",
    placeStyle: "hours-ops",
    blogStyle: "how-to",
  },
  {
    match: /편안침대/i,
    industry: "furniture",
    tone: "trust",
    kpiGoal: "reservation",
    brandMood: "신뢰·가족",
    writingStyle: "trust-warm",
    sentenceLength: "medium",
    emojiLevel: "low",
    brandDescription: "침대·수면 상담, 매장 방문·행사 안내",
    placeStyle: "store-notice",
    blogStyle: "family-trust",
  },
];
