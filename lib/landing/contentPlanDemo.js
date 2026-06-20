/** 랜딩 — 월·주 운영 계획 데모 (저장·API 없음) */

export const CONTENT_PLAN_DEMO = {
  month: "2026년 6월",
  headline: "6월 — 시즌 소식 · 플레이스 · 인스타까지 한 리듬",
  brand: "레이어드살롱",
  region: "홍대",
  weeks: [
    {
      id: "w1",
      label: "1주",
      focus: "시즌 컬러 이벤트",
      channels: ["이야기"],
      status: "current",
    },
    {
      id: "w2",
      label: "2주",
      focus: "여름 관리 팁 · 후기형",
      channels: ["이야기", "플레이스"],
      status: "upcoming",
    },
    {
      id: "w3",
      label: "3주",
      focus: "신규 고객 안내 · 한 장면",
      channels: ["인스타"],
      status: "upcoming",
    },
    {
      id: "w4",
      label: "4주",
      focus: "한 달 정리 · 다음 달 주제",
      channels: ["플레이스"],
      status: "upcoming",
    },
  ],
  habits: ["목·토 발행", "플레이스는 수요", "인스타는 주 2회"],
};
