export const ARTICLE_TYPE_OPTIONS = [
  { value: "info", label: "정보형" },
  { value: "review", label: "후기형" },
  { value: "visit", label: "방문형" },
  { value: "event", label: "이벤트형" },
  { value: "brand", label: "브랜드소개형" },
  { value: "compare", label: "비교형" },
  { value: "season", label: "시즌형" },
];

export function getArticleTypeModifier(key) {
  const map = {
    info: {
      label: "정보형",
      introStyle: "궁금해하시는 정보를 차분하게 정리하는 흐름",
      focus: "방문 전 알아두면 좋은 사실·절차·팁",
    },
    review: {
      label: "후기형",
      introStyle: "실제 이용 맥락에서 느낀 점을 중심으로",
      focus: "경험 포인트·만족 요소·아쉬웠던 점 균형",
    },
    visit: {
      label: "방문형",
      introStyle: "그날 방문 계기와 동선을 따라가는 흐름",
      focus: "공간 첫인상·이용 순서·현장 디테일",
    },
    event: {
      label: "이벤트형",
      introStyle: "이번 기간 소식을 먼저 짚고 혜택으로 연결",
      focus: "기간·혜택·참여 방법·유의사항",
    },
    brand: {
      label: "브랜드소개형",
      introStyle: "브랜드가 지향하는 가치에서 시작",
      focus: "철학·차별점·대표 서비스·고객과의 약속",
    },
    compare: {
      label: "비교형",
      introStyle: "선택 기준을 먼저 제시하는 구조",
      focus: "비교 포인트·장단·누구에게 맞는지",
    },
    season: {
      label: "시즌형",
      introStyle: "지금 이 시기에 왜 이야기하는지부터",
      focus: "시즌 분위기·한정 요소·추천 타이밍",
    },
  };
  return map[key] || map.info;
}
