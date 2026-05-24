/**
 * 랜딩 히어로 인사 — 접속(세션)마다 순환
 * 제목은 역할이 분명하게, 「초안」 직접 언급 지양
 */

export const LANDING_GREETINGS_PUBLIC = [
  {
    id: "topic",
    headline: "오늘 쓸 글,",
    headlineBreak: "여기서 맞추기",
    sub: "브랜드와 지역, 오늘의 주제만 넣으면 이야기 · 플레이스 · 인스타 문장이 한 톤으로 정리돼요.",
  },
  {
    id: "three",
    headline: "주제 하나로",
    headlineBreak: "세 채널까지",
    sub: "긴 이야기 · 한 줄 공지 · 인스타 캡션을 한곳에서 맞춰 씁니다. 확인하고 복사해 올리면 됩니다.",
  },
  {
    id: "tone",
    headline: "우리 가게 말투로",
    headlineBreak: "그대로 쓰기",
    sub: "카페 · 꽃집 · 동네 가게도 부담 없이. 브랜드만 정하면 글 흐름이 이어집니다.",
  },
  {
    id: "copy",
    headline: "쓰고, 고르고,",
    headlineBreak: "복사하기",
    sub: "네이버 · 플레이스 · 인스타에 붙일 문장을 나눠 드립니다. 업로드는 각 앱에서 직접 하시면 됩니다.",
  },
  {
    id: "check",
    headline: "올리기 전에",
    headlineBreak: "한번 더 보기",
    sub: "너무 길거나 어색한 표현을 짚어 드립니다. 민감 업종은 꼭 직접 확인해 주세요.",
  },
  {
    id: "week",
    headline: "이번 주 소식,",
    headlineBreak: "한 번에 정리",
    sub: "신메뉴 · 기념일 · 시즌 안내도 주제 한 줄이면 시작할 수 있어요.",
  },
  {
    id: "free",
    headline: "먼저 무료로",
    headlineBreak: "가볍게 써 보기",
    sub: "가입 후 이야기 5회부터 이용할 수 있어요. 채널이 늘면 플러스 · 스튜디오를 고르시면 됩니다.",
  },
  {
    id: "mobile",
    headline: "폰에서 쓰고",
    headlineBreak: "바로 복사",
    sub: "좁은 화면에도 맞춰 줄을 나눠 드립니다. 카페 테이블에서도 편하게 쓸 수 있어요.",
  },
];

/** @deprecated 랜딩은 LANDING_GREETINGS_PUBLIC 사용 */
export const LANDING_GREETINGS = LANDING_GREETINGS_PUBLIC;

export function getGreetingByIndex(index) {
  const list = LANDING_GREETINGS_PUBLIC;
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
