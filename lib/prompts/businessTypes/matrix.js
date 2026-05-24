/**
 * BRICLOG 비즈니스 성격 기반 Prompt Matrix
 * 1차: businessType · 2차: industry
 */

export const BUSINESS_TYPE_OPTIONS = [
  { value: "space", label: "공간형", hint: "매장·내원·체험 공간" },
  { value: "product", label: "제품형", hint: "상품·선물·구매" },
  { value: "service", label: "서비스형", hint: "상담·의뢰·B2C 서비스" },
  { value: "info", label: "정보형", hint: "안내·교육·정보 제공" },
  { value: "premium", label: "프리미엄형", hint: "고급·브랜드·상담 예약" },
  { value: "localVisit", label: "지역방문형", hint: "동네·상권·방문 유도" },
  { value: "b2b", label: "B2B형", hint: "기업·파트너·제안" },
  { value: "brand", label: "브랜드형", hint: "브랜드 스토리·D2C" },
  { value: "seasonal", label: "시즌형", hint: "시즌·한정·이벤트" },
  { value: "reservation", label: "예약형", hint: "예약·대기·문의" },
  { value: "experience", label: "체험형", hint: "워크숍·체험·클래스" },
];

const BASE = {
  space: {
    spaceWord: "매장",
    moodWords: ["분위기", "동선", "응대", "조도"],
    productWord: "대표 메뉴·서비스",
    visitReason: "방문·상담·체험",
    naverStyle: "네이버 플레이스·블로그 방문 후기형",
  },
  product: {
    spaceWord: "샵",
    moodWords: ["구성", "포장", "컬러", "선물"],
    productWord: "대표 상품",
    visitReason: "선물·구매·픽업",
    naverStyle: "네이버 쇼핑·블로그 선물·구매 가이드형",
  },
  service: {
    spaceWord: "사무실·상담실",
    moodWords: ["신뢰", "절차", "상담", "응대"],
    productWord: "상담·의뢰 서비스",
    visitReason: "상담·문의·계약",
    naverStyle: "네이버 정보·신뢰·절차 안내형",
  },
  info: {
    spaceWord: "안내 공간",
    moodWords: ["정보", "절차", "FAQ", "상담"],
    productWord: "프로그램·코스",
    visitReason: "문의·등록·상담",
    naverStyle: "네이버 정보·가이드형",
  },
  premium: {
    spaceWord: "라운지·쇼룸",
    moodWords: ["여백", "재질", "조명", "품격"],
    productWord: "프리미엄 라인",
    visitReason: "상담·예약·프라이빗",
    naverStyle: "네이버 프리미엄·브랜드형",
  },
  localVisit: {
    spaceWord: "매장",
    moodWords: ["동네", "상권", "분위기", "재방문"],
    productWord: "시그니처",
    visitReason: "근처 방문·맛집·핫플",
    naverStyle: "네이버 지역·맛집·핫플형",
  },
  b2b: {
    spaceWord: "사업장",
    moodWords: ["전문성", "실적", "프로세스", "제안"],
    productWord: "솔루션·용역",
    visitReason: "미팅·제안·견적",
    naverStyle: "네이버 B2B·전문 안내형",
  },
  brand: {
    spaceWord: "브랜드 공간",
    moodWords: ["스토리", "가치", "디테일", "경험"],
    productWord: "시그니처 라인",
    visitReason: "브랜드 경험·구매",
    naverStyle: "네이버 브랜드 스토리형",
  },
  seasonal: {
    spaceWord: "매장",
    moodWords: ["시즌", "한정", "분위기", "선물"],
    productWord: "시즌 상품",
    visitReason: "시즌·이벤트·선물",
    naverStyle: "네이버 시즌·이벤트형",
  },
  reservation: {
    spaceWord: "매장",
    moodWords: ["예약", "대기", "응대", "안내"],
    productWord: "예약 서비스",
    visitReason: "예약·내원",
    naverStyle: "네이버 예약·방문 안내형",
  },
  experience: {
    spaceWord: "체험 공간",
    moodWords: ["과정", "참여", "기록", "분위기"],
    productWord: "체험 프로그램",
    visitReason: "체험·클래스·참여",
    naverStyle: "네이버 체험·후기형",
  },
};

/** @type {Record<string, { value: string, label: string, legacyKey?: string, keywords?: string[], overrides?: object }[]>} */
export const INDUSTRY_BY_TYPE = {
  space: [
    { value: "cafe", label: "카페", legacyKey: "cafe", keywords: ["카페", "커피"] },
    { value: "hospital", label: "병원·의원", legacyKey: "hospital", keywords: ["병원", "의원"] },
    { value: "salon", label: "미용실", keywords: ["미용", "헤어", "네일"] },
    { value: "gym", label: "헬스장·필라테스", keywords: ["헬스", "필라테스"] },
    { value: "showroom", label: "쇼룸", keywords: ["쇼룸", "전시"] },
    { value: "clinic", label: "클리닉·피부", keywords: ["피부", "클리닉"] },
  ],
  product: [
    { value: "flower", label: "꽃집", legacyKey: "flower", keywords: ["꽃", "플라워"] },
    { value: "furniture", label: "가구·인테리어", legacyKey: "furniture", keywords: ["가구", "인테리어"] },
    { value: "diffuser", label: "디퓨저·향", keywords: ["디퓨저", "향", "캔들"] },
    { value: "fashion", label: "패션·의류", keywords: ["패션", "의류"] },
    { value: "lifestyle", label: "잡화·라이프", keywords: ["잡화", "라이프"] },
  ],
  service: [
    { value: "tax", label: "세무·회계", keywords: ["세무", "회계", "세무사"] },
    { value: "legal", label: "법무·변호", keywords: ["법무", "변호", "법률", "법률사무소"] },
    { value: "realestate", label: "부동산·중개", legacyKey: "realestate", keywords: ["부동산", "중개", "공인중개"] },
    { value: "pharmacy", label: "약국", keywords: ["약국", "약사"] },
    { value: "cleaning", label: "청소·이사", keywords: ["청소", "이사"] },
    { value: "consulting", label: "컨설팅", keywords: ["컨설팅"] },
  ],
  info: [
    { value: "academy", label: "학원·교육", keywords: ["학원", "교육"] },
    { value: "insurance", label: "보험·금융 안내", keywords: ["보험"] },
  ],
  premium: [
    { value: "hotel", label: "호텔·스테이", keywords: ["호텔"] },
    { value: "wedding", label: "웨딩·연회", keywords: ["웨딩"] },
  ],
  localVisit: [
    { value: "restaurant", label: "음식점", keywords: ["맛집", "음식"] },
    { value: "mart", label: "마트·상점", keywords: ["마트", "상점"] },
  ],
  b2b: [
    { value: "manufacturing", label: "제조·생산", keywords: ["제조"] },
    { value: "wholesale", label: "도매·유통", keywords: ["도매"] },
  ],
  brand: [
    { value: "d2c", label: "D2C·자사몰", keywords: ["브랜드", "자사몰"] },
    { value: "franchise", label: "프랜차이즈", keywords: ["프랜차이즈"] },
  ],
  seasonal: [
    { value: "seasonShop", label: "시즌 매장", keywords: ["시즌"] },
    { value: "gift", label: "선물·기념일", keywords: ["선물", "기념"] },
  ],
  reservation: [
    { value: "reserveClinic", label: "예약·진료", keywords: ["예약", "진료"] },
    { value: "reserveRestaurant", label: "예약·식당", keywords: ["예약", "식당"] },
  ],
  experience: [
    { value: "workshop", label: "원데이·공방", keywords: ["원데이", "공방"] },
    { value: "tour", label: "투어·체험", keywords: ["투어", "체험"] },
  ],
};

export function getIndustriesForType(businessType) {
  return INDUSTRY_BY_TYPE[businessType] || INDUSTRY_BY_TYPE.space;
}

export function getDefaultIndustry(businessType) {
  return getIndustriesForType(businessType)[0]?.value || "cafe";
}

export function findIndustryEntry(businessType, industryValue) {
  const list = getIndustriesForType(businessType);
  return list.find((i) => i.value === industryValue) || list[0];
}

export function getBusinessTypeBase(businessType) {
  return BASE[businessType] || BASE.space;
}
