/**
 * 상세 출고 기준 SSOT.
 * 화면 순서 = 국내 몰 상세 9칸 (후킹→정보→나열→재료→원료→스펙→패키지→배송→필수정보).
 * 붙이는 형식 = 섹션 PNG 스택. 가짜 후기·모델컷·GIF·9몰은 가져오지 않는다.
 * 리스트 툴(크리에이지 가구 20섹션)은 형식만. 그 순서를 식품·양곡에 쓰지 않는다.
 */
export const DETAIL_PAGE_RANKING_PLAYBOOK_VERSION = "detail-ranking-playbook-v4";

export const DETAIL_PAGE_STANDARD_SOURCES = Object.freeze({
  rank: {
    id: "naver-shop-rank",
    label: "네이버 쇼핑 랭킹 상세",
    queries: [
      "여주햅쌀 10kg 스마트스토어",
      "대왕님표 여주쌀 진상미 10kg 상세",
      "원두 200g 당일로스팅 스마트스토어",
      "하우스블렌드 원두 200g 상세페이지",
    ],
    sampleIds: ["open-rice", "open-beans"],
    take: "몰 상세 9칸 · 나열 칸의 항목은 그 카테고리 상위 상세(쌀: 산지→햅쌀→도정→중량→포장)",
    leave: "없는 품종·등급·인증, 네이버 오류·가격비교 허브 페이지를 상품 근거로 쓰기",
  },
  list: {
    id: "list-tool-sample",
    label: "리스트 공개 샘플",
    tools: ["hookable", "creazy", "draph", "gency"],
    canonical: "creazy",
    take: "섹션 PNG 스택(통이미지)",
    leave: "가구 20섹션 순서, 가짜 후기·모델컷·GIF·이벤트 CTA",
  },
});

/**
 * 국내 식품·CPG 상세가 실제로 읽는 뼈대.
 * 광고 스토리보드(밥→들판→짓기→식탁)가 아니라 고르는 손님이 스크롤하는 칸.
 */
export const DETAIL_PAGE_MALL_SEQUENCE = Object.freeze([
  { slot: "hero", beat: "hook", they: "후킹", we: "첫 화면을 멈추는 한 컷" },
  { slot: "intent", beat: "info", they: "정보", we: "이 상품이 뭔가" },
  { slot: "explain", beat: "listing", they: "나열", we: "카테고리 칸을 한 화면에" },
  { slot: "observe", beat: "ingredient", they: "재료", we: "알맹이·구성" },
  { slot: "usp", beat: "material", they: "원료", we: "산지·원재료" },
  { slot: "spec", beat: "spec", they: "스펙", we: "중량·옵션·가격" },
  { slot: "feature", beat: "package", they: "패키지", we: "포장 실물" },
  { slot: "scene", beat: "shipping", they: "배송정보", we: "배송·출고" },
  { slot: "cta", beat: "notice", they: "필수정보", we: "교환·고시" },
]);

/** 레거시 10칸. 출고 순서는 DETAIL_PAGE_MALL_SEQUENCE. */
export const DETAIL_PAGE_RANKING_SEQUENCE = Object.freeze([
  { slot: "hero", they: "후킹", we: "첫 화면을 멈추는 한 컷" },
  { slot: "intent", they: "정보", we: "이 상품이 뭔가" },
  { slot: "explain", they: "나열", we: "카테고리 상위 상세가 읽는 칸" },
  { slot: "usp", they: "원료", we: "산지·원재료" },
  { slot: "observe", they: "재료", we: "알맹이·구성" },
  { slot: "feature", they: "패키지", we: "포장 실물" },
  { slot: "scene", they: "배송정보", we: "배송·출고" },
  { slot: "spec", they: "스펙", we: "중량·옵션·가격" },
  { slot: "brand", they: "브랜드 스토리", we: "브랜드 은근" },
  { slot: "cta", they: "필수정보", we: "교환·고시" },
]);

export function mallBeatForSlot(slot) {
  return DETAIL_PAGE_MALL_SEQUENCE.find((s) => s.slot === slot)?.beat || "";
}

/**
 * 크리에이지 공개 샘플(360도 회전 사이드 테이블, creazy.app/ko) 20섹션.
 * 리스트 샘플의 화면 기준. 후기는 가져오지 않는다.
 */
export const DETAIL_PAGE_LIST_SAMPLE = Object.freeze({
  id: "creazy",
  url: "https://creazy.app/ko",
  product: "360도 회전형 이동식 사이드 테이블",
  sections: [
    { n: 1, they: "당일 발송 안내", we: "notice", take: false, why: "배송 사실 있을 때만" },
    { n: 2, they: "히어로 배너", we: "hero", take: true },
    { n: 3, they: "고민 솔루션", we: "intent", take: true },
    { n: 4, they: "사용자 리뷰", we: null, take: false, why: "가짜 후기" },
    { n: 5, they: "핵심 소구점 5 Points", we: "explain", take: true },
    { n: 6, they: "USP 01", we: "usp", take: true },
    { n: 7, they: "라이프스타일 갤러리", we: "observe", take: true },
    { n: 8, they: "활용 팁", we: "scene", take: true },
    { n: 9, they: "USP 02", we: "usp", take: true },
    { n: 10, they: "공인 성적서", we: null, take: false, why: "없는 인증" },
    { n: 11, they: "USP 03", we: "feature", take: true },
    { n: 12, they: "비교 그래프", we: null, take: false, why: "없는 수치" },
    { n: 13, they: "USP 04", we: "feature", take: true },
    { n: 14, they: "조립 가이드", we: "scene", take: true },
    { n: 15, they: "브랜드 스토리(다크)", we: "brand", take: true },
    { n: 16, they: "브랜드 리마인드", we: "brand", take: true },
    { n: 17, they: "구매자 리뷰", we: null, take: false, why: "가짜 후기" },
    { n: 18, they: "SPEC", we: "spec", take: true },
    { n: 19, they: "포토리뷰 이벤트", we: null, take: false, why: "이벤트 CTA" },
    { n: 20, they: "CS·교환/반품", we: "notice", take: false, why: "입력된 안내만" },
  ],
});

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

const RANKING_SLOT_INDEX = Object.fromEntries(
  DETAIL_PAGE_RANKING_SEQUENCE.map((s, i) => [s.slot, i])
);
const MALL_SLOT_INDEX = Object.fromEntries(
  DETAIL_PAGE_MALL_SEQUENCE.map((s, i) => [s.slot, i])
);

function followsSlotIndex(types, index) {
  let last = -1;
  for (const type of types) {
    if (type === "notice" || type === "brand") continue;
    const idx = index[type];
    if (idx == null || idx <= last) return false;
    last = idx;
  }
  return last >= 0;
}

export function normalizeDetailPageSectionType(type) {
  return type === "problem" ? "intent" : type;
}

export function detailPageSectionTypes(pack) {
  return (pack?.sections || []).map((s) =>
    normalizeDetailPageSectionType(s?.type)
  );
}

/** 랭킹 순서의 부분열이면 통과. 히어로로 시작해 CTA로 끝낸다. */
export function packFollowsRankingSequence(pack) {
  const types = detailPageSectionTypes(pack);
  if (!types.length) return false;
  if (types[0] !== "hero" || types[types.length - 1] !== "cta") return false;
  if (
    pack?._meta?.plan?.customOrder === true ||
    pack?._meta?.renderer === "detail-canvas"
  ) {
    return new Set(types).size === types.length;
  }
  return followsSlotIndex(types, MALL_SLOT_INDEX) || followsSlotIndex(types, RANKING_SLOT_INDEX);
}

export function sortSectionsToRanking(sections, sectionIds) {
  const byType = {};
  for (const section of sections || []) {
    const type = normalizeDetailPageSectionType(section?.type);
    if (!type || byType[type]) continue;
    byType[type] = { ...section, type };
  }
  return (sectionIds || DETAIL_PAGE_RANKING_SEQUENCE.map((s) => s.slot))
    .map((id) => byType[id])
    .filter(Boolean);
}

export function rankingStandardMeta(pack) {
  return {
    version: DETAIL_PAGE_RANKING_PLAYBOOK_VERSION,
    source: DETAIL_PAGE_STANDARD_SOURCES.rank.id,
    listSample: DETAIL_PAGE_LIST_SAMPLE.id,
    ok: packFollowsRankingSequence(pack),
  };
}

export function formatRankingPlaybookForPrompt() {
  const mall = DETAIL_PAGE_MALL_SEQUENCE.map(
    (s, i) => `${String(i + 1).padStart(2, "0")} ${s.they} (${s.slot}/${s.beat}) → ${s.we}`
  ).join("\n");
  const tools = DETAIL_PAGE_LIST_TOOL_USE.map(
    (t) => `${t.they}: 가져옴=${t.take} / 안 가져옴=${t.leave}`
  ).join("\n");
  const sample = DETAIL_PAGE_LIST_SAMPLE.sections
    .filter((s) => s.take)
    .map((s) => `${String(s.n).padStart(2, "0")} ${s.they} → ${s.we}`)
    .join(" · ");
  return [
    "출고 기준 1: 네이버 쇼핑 랭킹 상세가 읽는 국내 몰 9칸 — 후킹 > 정보 > 나열 > 재료 > 원료 > 스펙 > 패키지 > 배송정보 > 필수정보.",
    "출고 기준 2: 맛보기·편집 원판은 HTML 텍스트다. 몰 붙여넣기용 섹션 PNG는 선택 출고.",
    mall,
    "나열 칸의 항목만 카테고리 상위 상세 순서다. 화면 뼈대를 광고 스토리보드로 바꾸지 않는다.",
    `리스트 샘플에서 가져오는 칸(형식만): ${sample}`,
    tools,
    "금지: 가짜 후기·별점·없는 인증·지금 바로 구매·모델컷. 없는 값은 [자료 필요]로 표시한다.",
  ].join("\n");
}
