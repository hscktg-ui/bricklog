/** 업종별 문체·금지어·공간 묘사 힌트 */
export const INDUSTRY_FLAVOR = {
  flower: {
    label: "꽃집",
    spaceWord: "플라워샵",
    moodWords: ["향기", "컬러", "리본", "생화 톤"],
    productWord: "꽃다발·화환·플랜트",
    visitReason: "선물·기념일·집들이",
    forbidden: ["완치", "최고의 병원"],
    problemOpenings: [
      "꽃을 사야 하는 날은 생각보다 많다. 생일·퇴사·사과·축하처럼 막히는 날이 이어진다.",
      "막상 꽃집을 찾으면 어디로 가야 할지, 어떤 톤이 맞을지부터 막힌다.",
    ],
    infoProblemOpenings: [
      "막상 꽃을 골라야 하는데, 이번엔 색감보다 어디에 둘지부터 헷갈렸다.",
      "요즘 매장마다 들어오는 꽃 톤이 달라 보여서, 직접 가서 비교해 보기로 했다.",
    ],
    titlePatterns: [
      "{region} {main}, 기분까지 바뀌는 꽃 선택 기준",
      "{main} 찾을 때 {region}에서 먼저 보는 것",
      "마음 전하는 {main}, {region} {brand} 이야기",
      "{region} {sub} 꽃집, 시즌에 맞게 고르는 법",
      "{main} 예약 전 {region}에서 확인할 포인트",
    ],
    infoTitlePatterns: [
      "{region} {main}, 시즌별 고르기 좋은 꽃 정리",
      "{main} 고를 때 {region}에서 먼저 보는 종류·보관",
      "여름철 {main}, {region} {brand} 선택 기준",
      "{main} 종류·색감, {region}에서 확인할 포인트",
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
    productWord: "프레임·침실 연출·전시 구성",
    visitReason: "인테리어·이사·교체",
    forbidden: [],
    problemOpenings: [
      "아침에 일어나면 허리가 먼저 아픈 사람들이 있다. 침대를 바꿀지 말지부터 고민이 길어진다.",
      "누워서 각도를 바꾸고 싶은데, 소음·흔들림이 걱정되면 모션 침대부터 망설여진다.",
      "전시 소식을 보고 가도, 막상 쇼룸에 서면 어떤 라인업이 전시대에 있는지부터 헷갈린다.",
    ],
    titlePatterns: [
      "{region} {brand} 오피모 전시, 쇼룸에서 직접 본 점",
      "{region} {brand} {main} 보러 다녀온 솔직 후기",
      "{main} 고를 때 {region} {brand} 방문 이유",
      "공간이 달라지는 {main} 선택 기준",
      "{region} 가구 매장, {sub} 비교 포인트",
      "{main} 상담 전 {region}에서 준비할 것",
    ],
  },
  salon: {
    label: "미용실",
    spaceWord: "매장·상담실",
    moodWords: ["상담", "시술", "톤", "두피"],
    productWord: "컷·염색·케어",
    visitReason: "염색·펌·두피 고민",
    forbidden: ["완치", "100%"],
    problemOpenings: [
      "염색은 하고 싶은데 두피가 먼저 걱정되는 날이 있다.",
      "시술 전 두피가 당기고 각질이 올라오면 일정부터 미뤄지기 쉽다.",
    ],
    titlePatterns: [
      "{region} {main}, 두피·염색 전 상담이 편한 이유",
      "{main} 고를 때 {region}에서 먼저 보는 것",
    ],
  },
  pet_cafe: {
    label: "애견카페",
    spaceWord: "매장",
    moodWords: ["좌석", "실내 놀이", "분위기", "메뉴"],
    productWord: "음료·간식·이용 안내",
    visitReason: "반려견 동반·실내 놀이",
    forbidden: ["완치", "100%"],
    problemOpenings: [
      "반려견과 함께 쉬고 싶은데, 입장 조건·좌석·실내 놀이 구역을 검색만으로는 잘 안 그려지는 날이 있다.",
      "애견카페를 찾다 보면 몸무게·리드줄·실내 규칙부터 막히는 경우가 많다.",
    ],
    titlePatterns: [
      "{region} {main}, 반려견과 함께 가기 좋은 이유",
      "{main} 방문 전 {region}에서 확인할 포인트",
      "{region} {brand} {main} 다녀온 솔직 후기",
    ],
  },
  pet: {
    label: "반려·펫",
    spaceWord: "매장",
    moodWords: ["성분", "향", "질감", "급여"],
    productWord: "간식·사료",
    visitReason: "성분·알레르기·취향",
    forbidden: ["완치", "100%"],
    problemOpenings: [
      "간식을 고를 때 성분·알레르기가 먼저 걱정되는 날이 있다.",
      "무첨가·원료를 찾다 보면 매장마다 설명 방식이 달라 비교가 길어진다.",
    ],
    titlePatterns: [
      "{region} {main}, 반려 간식 고를 때 보는 기준",
    ],
  },
  marketing: {
    label: "마케팅·광고",
    spaceWord: "사무실·상담실",
    moodWords: ["소통", "제안", "사례", "프로세스"],
    productWord: "블로그·채널 마케팅",
    visitReason: "상담·제안·비교",
    forbidden: ["100% 성공", "무조건 상위노출"],
    problemOpenings: [
      "블로그 마케팅이 필요하다는 건 알지만, 대행사를 고를 때 무엇을 기준으로 볼지 막히는 날이 있다.",
      "검색만 하다 보면 기준이 많아서 어디서부터 상담받을지 막히는 날이 있다.",
    ],
    titlePatterns: [
      "{region} {brand} {main}, 상담 다녀온 솔직 후기",
      "{main} 고를 때 {region}에서 먼저 보는 것",
      "{region} {brand} 마케팅, 방문 상담 후 정리",
      "{sub} 관련 {region} {main} 이야기",
    ],
  },
  cafe: {
    label: "카페",
    spaceWord: "매장",
    moodWords: ["조도", "좌석", "음악", "컵"],
    productWord: "시그니처 메뉴·브런치",
    visitReason: "카공·데이트·브런치",
    forbidden: [],
    problemOpenings: [
      "브런치 메뉴를 찾다 보면 분위기와 가격 사이에서 막히는 날이 있다.",
      "카공·모임 자리를 잡을 때는 좌석·콘센트부터 먼저 걱정되는 경우가 많다.",
    ],
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
    problemOpenings: [
      "검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있다.",
    ],
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
