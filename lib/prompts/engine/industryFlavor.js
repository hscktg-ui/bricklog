/** 업종별 문체·금지어·공간 묘사 힌트 */
export const INDUSTRY_FLAVOR = {
  flower: {
    label: "꽃집",
    spaceWord: "플라워샵",
    moodWords: ["향기", "컬러", "리본", "시즌 꽃재"],
    productWord: "꽃다발·화환·플랜트",
    visitReason: "선물·기념일·집들이",
    forbidden: ["완치", "최고의 병원"],
    titlePatterns: [
      "{region} {main}, 기분까지 바뀌는 꽃 선택 기준",
      "{main} 찾을 때 {region}에서 먼저 보는 것",
      "마음 전하는 {main}, {region} {brand} 이야기",
      "{region} {sub} 꽃집, 시즌에 맞게 고르는 법",
      "{main} 예약 전 {region}에서 확인할 포인트",
    ],
  },
  hospital: {
    label: "병원·의원",
    spaceWord: "진료 공간",
    moodWords: ["대기", "상담", "접수", "안내"],
    productWord: "진료·검진·상담",
    visitReason: "증상·검진·상담",
    forbidden: [
      "100%",
      "완치",
      "확실히",
      "최고",
      "유일",
      "무조건",
      "치료 보장",
      "전문의가 보장",
    ],
    titlePatterns: [
      "{region} {main}, 방문 전 알아두면 좋은 안내",
      "{main} 검색하실 때 {region}에서 확인할 점",
      "{region} {brand} 이용 전 궁금한 것들",
      "{main} 관련 {region} 내원 가이드",
      "{sub} 고려하실 때 참고할 정보",
    ],
  },
  furniture: {
    label: "가구·인테리어",
    spaceWord: "쇼룸",
    moodWords: ["동선", "재질", "조명", "여백"],
    productWord: "소파·테이블·수납",
    visitReason: "인테리어·이사·교체",
    forbidden: [],
    titlePatterns: [
      "{region} {main}, 쇼룸에서 보는 체크리스트",
      "{main} 고를 때 {region} {brand} 방문 이유",
      "공간이 달라지는 {main} 선택 기준",
      "{region} 가구 매장, {sub} 비교 포인트",
      "{main} 상담 전 {region}에서 준비할 것",
    ],
  },
  cafe: {
    label: "카페",
    spaceWord: "매장",
    moodWords: ["조도", "좌석", "음악", "컵"],
    productWord: "시그니처 메뉴·브런치",
    visitReason: "카공·데이트·브런치",
    forbidden: [],
    titlePatterns: [
      "{region} {main}, 앉아 있기 좋은 이유",
      "{main} 검색할 때 {region} 분위기 체크",
      "{region} {brand}에서 메뉴 고르는 기준",
      "{sub} 찾는다면 {region} {main} 참고",
      "{main} 혼잡한 시간 피하는 {region} 팁",
    ],
  },
  default: {
    label: "로컬 매장",
    spaceWord: "매장",
    moodWords: ["분위기", "응대", "위치"],
    productWord: "대표 서비스",
    visitReason: "방문·상담",
    forbidden: [],
    titlePatterns: [
      "{region} {main}, 처음 방문 전 정리",
      "{main} 알아볼 때 {region} 기준",
      "{region} {brand} 이용 가이드",
      "{sub} 관련 {region} {main} 이야기",
      "{main} 문의 전 확인할 점",
    ],
  },
};

export function getIndustryFlavor(industryKey) {
  return INDUSTRY_FLAVOR[industryKey] || INDUSTRY_FLAVOR.default;
}
