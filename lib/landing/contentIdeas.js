/**
 * 오늘의 콘텐츠 아이디어 — 방문마다 sessionStorage로 순환
 */

export const LANDING_CONTENT_IDEAS = [
  {
    id: "new-menu",
    text: "이번 주 신메뉴, 첫 방문 고객에게 어떻게 소개할까요?",
  },
  {
    id: "review",
    text: "최근 후기 한 줄을 블로그·플레이스·인스타에 각각 다르게 풀어보기",
  },
  {
    id: "season",
    text: "계절이 바뀔 때, 매장 분위기를 짧은 글로 남겨보기",
  },
  {
    id: "staff",
    text: "오늘의 한 컷 — 직원·작업 과정을 브랜드 톤으로 기록하기",
  },
  {
    id: "faq",
    text: "자주 묻는 질문 하나를, 검색에 맞는 블로그 문장으로 정리하기",
  },
  {
    id: "event",
    text: "이번 달 이벤트, 방문 전에 꼭 알아두면 좋은 내용만 골라 쓰기",
  },
  {
    id: "thanks",
    text: "단골 고객에게 전하는 감사 한 줄, 채널마다 길이를 다르게",
  },
  {
    id: "behind",
    text: "준비 과정·비하인드를 인스타에, 상세는 블로그에 나눠 담기",
  },
  {
    id: "tip",
    text: "업종과 무관하게, 오늘의 작은 팁을 브랜드 말투로 적어보기",
  },
  {
    id: "place",
    text: "플레이스에 올릴 '오늘의 소식' 한 줄 초안 먼저 써보기",
  },
  {
    id: "reopen",
    text: "휴무·변동 안내를 차분한 문장으로, 세 채널에 맞게 정리하기",
  },
  {
    id: "collab",
    text: "협업·제휴 소식, 브랜드 스토리와 연결해 짧게 소개하기",
  },
];

export function getContentIdeaByIndex(index) {
  const list = LANDING_CONTENT_IDEAS;
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
