/**
 * 상세페이지 섹션 카탈로그 — 드랩/후커블/제디터/크리에이지 공통 블록
 * 픽셀 통생성이 아니라 섹션 JSON → 템플릿 채움.
 */

export const DETAIL_PAGE_WIDTH = 860;

export const DETAIL_PAGE_SECTION_TYPES = [
  "hero",
  "problem",
  "usp",
  "feature",
  "scene",
  "spec",
  "observe",
  "brand",
  "cta",
  "notice",
];

export const DETAIL_PAGE_LENGTHS = {
  short: {
    id: "short",
    label: "짧게",
    sectionIds: ["hero", "usp", "feature", "cta"],
  },
  standard: {
    id: "standard",
    label: "표준",
    sectionIds: [
      "hero",
      "problem",
      "usp",
      "feature",
      "scene",
      "spec",
      "observe",
      "brand",
      "cta",
    ],
  },
  long: {
    id: "long",
    label: "길게",
    sectionIds: [
      "hero",
      "problem",
      "usp",
      "feature",
      "scene",
      "spec",
      "observe",
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
