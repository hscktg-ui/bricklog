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
