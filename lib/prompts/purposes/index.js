/** 3차 분류 — 콘텐츠 목적 */
export const PURPOSE_OPTIONS = [
  { value: "newOpen", label: "신규오픈" },
  { value: "event", label: "행사·이벤트" },
  { value: "review", label: "후기형" },
  { value: "info", label: "정보형" },
  { value: "brand", label: "브랜드소개형" },
  { value: "season", label: "시즌형" },
  { value: "reservation", label: "예약유도형" },
  { value: "visitDrive", label: "방문유도형" },
  { value: "experience", label: "체험형" },
  { value: "compare", label: "비교형" },
];

/** 목적 → 블로그 글 유형 매핑 */
export const PURPOSE_TO_ARTICLE = {
  newOpen: "brand",
  event: "event",
  review: "review",
  info: "info",
  brand: "brand",
  season: "season",
  reservation: "info",
  visitDrive: "visit",
  experience: "visit",
  compare: "compare",
};

export function getPurposeModifier(key) {
  const map = {
    newOpen: {
      label: "신규오픈",
      blogLead: "처음 인사드리며, 앞으로 어떻게 운영할지 소개합니다.",
      placeHook: "새로 오픈했습니다",
      instaHook: "드디어 문을 열었어요",
      cta: "첫 방문을 기다리고 있어요",
      channelFocus: { blog: "소개·기대", place: "오픈 소식", insta: "오픈 감성" },
    },
    event: {
      label: "행사·이벤트",
      blogLead: "이번 기간 진행되는 소식을 정리해 드립니다.",
      placeHook: "진행 중인 이벤트",
      instaHook: "잠깐, 놓치면 아쉬운 소식",
      cta: "행사 기간 내 방문·문의 환영합니다",
      channelFocus: { blog: "일정·혜택", place: "이벤트", insta: "한정" },
    },
    review: {
      label: "후기형",
      blogLead: "실제 방문·이용 맥락에서 도움이 되는 내용을 담았습니다.",
      placeHook: "방문 후기 요약",
      instaHook: "많은 분들이 찾아주신 이유",
      cta: "방문 경험을 댓글로 나눠 주세요",
      channelFocus: { blog: "경험", place: "후기", insta: "공감" },
    },
    info: {
      label: "정보형",
      blogLead: "궁금해하시는 정보 위주로 차분하게 정리했습니다.",
      placeHook: "방문 전 안내",
      instaHook: "궁금할 때 저장해 두세요",
      cta: "추가 문의는 편하게 연락 주세요",
      channelFocus: { blog: "가이드", place: "안내", insta: "팁" },
    },
    brand: {
      label: "브랜드소개형",
      blogLead: "브랜드가 지향하는 방향과 차별점을 소개합니다.",
      placeHook: "브랜드 소식",
      instaHook: "우리가 지향하는 분위기",
      cta: "브랜드 이야기 더 궁금하시면 문의 주세요",
      channelFocus: { blog: "스토리", place: "브랜드", insta: "정체성" },
    },
    season: {
      label: "시즌형",
      blogLead: "지금 이 시기에 맞춘 이야기를 전해 드립니다.",
      placeHook: "시즌 한정 안내",
      instaHook: "요즘 분위기 그대로",
      cta: "시즌 한정 소식 놓치지 마세요",
      channelFocus: { blog: "시즌", place: "한정", insta: "감성" },
    },
    reservation: {
      label: "예약유도형",
      blogLead: "예약·문의 전에 알아두시면 좋은 점을 정리했습니다.",
      placeHook: "예약·문의 안내",
      instaHook: "예약 전에 이것만 확인",
      cta: "예약·문의는 플레이스·전화로 편하게",
      channelFocus: { blog: "절차", place: "예약", insta: "안내" },
    },
    visitDrive: {
      label: "방문유도형",
      blogLead: "방문을 고민하시는 분들께 실용적인 기준을 드립니다.",
      placeHook: "방문 포인트 안내",
      instaHook: "이번 주 들러보기 좋은 이유",
      cta: "근처에 계시면 한번 들러보세요",
      channelFocus: { blog: "방문", place: "유도", insta: "동네" },
    },
    experience: {
      label: "체험형",
      blogLead: "체험·참여 과정을 중심으로 정리했습니다.",
      placeHook: "체험 프로그램 안내",
      instaHook: "직접 해보니까 달랐어요",
      cta: "체험 예약·문의 환영합니다",
      channelFocus: { blog: "과정", place: "체험", insta: "참여" },
    },
    compare: {
      label: "비교형",
      blogLead: "선택 기준을 먼저 정리해 드립니다.",
      placeHook: "비교 포인트 안내",
      instaHook: "고를 때 이 기준만 보세요",
      cta: "비교 후 문의·방문 환영합니다",
      channelFocus: { blog: "비교", place: "차별", insta: "체크리스트" },
    },
  };
  return map[key] || map.info;
}

export function getArticleTypeKeyFromPurpose(purposeKey) {
  return PURPOSE_TO_ARTICLE[purposeKey] || "info";
}
