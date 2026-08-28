/**
 * 골라보다 상세 섹션 — 고를 때 막히는 점 → 설명 → 관찰 → 약한 안내
 */
export const DETAIL_PAGE_WIDTH = 860;

export const DETAIL_PAGE_DEFAULT_ACCENT = "#9a3412";

/** 860px 상세 글꼴·간격 — 스마트스토어 붙여넣기용 인라인 */
export const DETAIL_PAGE_TYPE = {
  family:
    "'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','맑은 고딕',sans-serif",
  href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
  ink: "#171412",
  muted: "#5c574f",
  paper: "#ffffff",
  wash: "#f6f3ee",
  rule: "#ebe6df",
  heroBg: "#171412",
  heroFg: "#f7f4ef",
  kicker: 12,
  h1: 38,
  h2: 28,
  body: 18,
  spec: 16,
  bodyLh: 1.9,
  titleLh: 1.3,
  padX: 44,
  padY: 52,
};

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
      "feature",
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
  if (lengthId === "short") return 2800;
  if (lengthId === "long") return 4800;
  return 3800;
}
