/**
 * BRICLOG 상세 섹션 — 검색의도 → 설명 → 관찰 → 브랜드 은근 → 약한 안내
 */
export const DETAIL_PAGE_WIDTH = 860;

export const DETAIL_PAGE_DEFAULT_ACCENT = "#03a94d";

export const DETAIL_PAGE_SECTION_TYPES = [
  "hero",
  "intent",
  "explain",
  "usp",
  "observe",
  "feature",
  "scene",
  "spec",
  "brand",
  "notice",
  "cta",
  "problem",
];

export const DETAIL_PAGE_SECTION_LABELS = {
  hero: "맨 위",
  intent: "고를 때",
  problem: "막히는 점",
  explain: "설명",
  usp: "왜 이 상품",
  observe: "관찰",
  feature: "자세히",
  scene: "쓰는 장면",
  spec: "한눈에",
  brand: "브랜드",
  notice: "안내",
  cta: "다음 한 걸음",
};

export const DETAIL_PAGE_PASTE_STEPS = [
  "스마트스토어 또는 쿠팡 상품 등록을 연다",
  "상세설명에서 HTML(소스) 편집을 연다",
  "붙여넣은 뒤 미리보기에서 사진과 문장을 확인한다",
];

export const DETAIL_PAGE_LENGTHS = {
  short: {
    id: "short",
    label: "짧게",
    sectionIds: ["hero", "intent", "usp", "cta"],
  },
  standard: {
    id: "standard",
    label: "표준",
    sectionIds: [
      "hero",
      "intent",
      "explain",
      "usp",
      "observe",
      "spec",
      "brand",
      "cta",
    ],
  },
  long: {
    id: "long",
    label: "길게",
    sectionIds: [
      "hero",
      "intent",
      "explain",
      "usp",
      "observe",
      "feature",
      "scene",
      "spec",
      "brand",
      "notice",
      "cta",
    ],
  },
};

export function resolveDetailPageLength(value) {
  const key = String(value || "standard").toLowerCase();
  return DETAIL_PAGE_LENGTHS[key] || DETAIL_PAGE_LENGTHS.standard;
}

export function getDetailPageTokenBudget(lengthId = "standard") {
  if (lengthId === "short") return 1400;
  if (lengthId === "long") return 2200;
  return 1800;
}
