/**
 * 스마트스토어 상위 상세 리듬 — 조사 SSOT.
 * 리스트(후커블·크리에이지·드랩·젠시)가 주는 출고는 섹션 PNG 스택(통이미지)이다.
 * 화면 순서와 이미지를 가져온다. 가짜 후기·모델컷·GIF·9몰은 가져오지 않는다.
 */
export const DETAIL_PAGE_RANKING_PLAYBOOK_VERSION = "detail-ranking-playbook-v2";

/** 랭킹 상세·리스트 데모에서 반복되는 화면 순서. */
export const DETAIL_PAGE_RANKING_SEQUENCE = Object.freeze([
  { slot: "hero", they: "히어로 배너", we: "포장 앞면 + 상품명" },
  { slot: "intent", they: "고민 솔루션", we: "카테고리에서 고르는 순서" },
  { slot: "explain", they: "핵심 소구점 5 Points", we: "막히는 점 / 카테고리에서 먼저 볼 것" },
  { slot: "usp", they: "USP 카드", we: "소재·재료 항목" },
  { slot: "observe", they: "제품 가까이·갤러리", we: "손에 쥐거나 가까이 컷" },
  { slot: "feature", they: "디테일·비교", we: "남은 카테고리 항목" },
  { slot: "scene", they: "사용·조립 가이드", we: "카테고리 사용 순서" },
  { slot: "spec", they: "SPEC 표", we: "카테고리 항목 표" },
  { slot: "brand", they: "브랜드 스토리", we: "브랜드 은근" },
  { slot: "cta", they: "구매·이벤트 CTA", we: "약한 안내" },
]);

export const DETAIL_PAGE_LIST_TOOL_USE = Object.freeze([
  {
    id: "hookable",
    they: "후커블",
    rankingUse: "히트상품 판매 공식 + 리뷰 키워드로 카피 + 이미지 배치 + GIF",
    take: "섹션 PNG 스택(통이미지) + 첫눈 공식·컷 순서",
    leave: "리뷰 문장 복사, GIF 후킹",
  },
  {
    id: "creazy",
    they: "크리에이지",
    rankingUse:
      "상위 1% 20섹션(히어로→고민→5포인트→USP→리뷰→스펙→CS) + 통이미지 PNG",
    take: "섹션 PNG 스택(통이미지) + 히어로→막히는 점→포인트→USP→컷→장면→스펙 리듬",
    leave: "가짜 포토리뷰, 이벤트 애니메이션",
  },
  {
    id: "draph",
    they: "드랩아트",
    rankingUse: "카테고리 레이아웃 + AI 모델컷·배경 합성 후 PNG",
    take: "컷이 있어야 상세다 · 섹션 PNG 스택",
    leave: "가짜 모델컷, 얼굴 교체",
  },
  {
    id: "gency",
    they: "젠시",
    rankingUse: "전면·후면·디테일·코디컷 자동 분류 배치 (패션)",
    take: "컷 슬롯 자동 배치 · 섹션 PNG 스택",
    leave: "패션 모델컷 대량 생성",
  },
]);

export function formatRankingPlaybookForPrompt() {
  const seq = DETAIL_PAGE_RANKING_SEQUENCE.map(
    (s, i) => `${String(i + 1).padStart(2, "0")} ${s.slot} ← ${s.they} → ${s.we}`
  ).join("\n");
  const tools = DETAIL_PAGE_LIST_TOOL_USE.map(
    (t) => `${t.they}: 가져옴=${t.take} / 안 가져옴=${t.leave}`
  ).join("\n");
  return [
    "스마트스토어 상위 상세 리듬(조사·리스트 대조). 출고는 섹션 PNG 스택(통이미지). 텍스트 HTML 표가 주출고가 아니다. 나열 순서는 카테고리 분석.",
    seq,
    tools,
    "금지: 가짜 후기·별점·없는 인증·지금 바로 구매·모델컷. 통이미지는 가져온다.",
  ].join("\n");
}
