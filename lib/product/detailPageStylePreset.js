/**
 * 상세 스타일 프리셋. 추상 modern/luxury가 아니라 결과 차이가 나는 광고 톤.
 */
export const DETAIL_PAGE_STYLE_PRESET_VERSION = "detail-style-v1";

export const DETAIL_PAGE_STYLE_PRESETS = Object.freeze({
  studio_advertising: {
    id: "studio_advertising",
    label: "Studio Advertising",
    hint: "제품 중심 광고 촬영",
    strategy: "",
    pairing: "grocery",
    background: "minimal_warm_studio",
    palette: {
      primary: "#3f6b4a",
      secondary: "#c4b49a",
      background: "#f3eee4",
      accent: "#3f6b4a",
      text: "#1c1914",
    },
  },
  brand_lookbook: {
    id: "brand_lookbook",
    label: "Brand Lookbook",
    hint: "브랜드 캠페인",
    strategy: "lifestyle",
    pairing: "beauty",
    background: "soft_editorial",
    palette: {
      primary: "#6b4a55",
      secondary: "#d8c4c0",
      background: "#f6f0ec",
      accent: "#8a5a62",
      text: "#2a201c",
    },
  },
  premium_editorial: {
    id: "premium_editorial",
    label: "Premium Editorial",
    hint: "잡지 에디토리얼",
    strategy: "premium_brand",
    pairing: "beauty",
    background: "quiet_paper",
    palette: {
      primary: "#2c2420",
      secondary: "#c9b8a6",
      background: "#f4efe8",
      accent: "#8a6a4a",
      text: "#1a1613",
    },
  },
  performance_sales: {
    id: "performance_sales",
    label: "Performance Sales",
    hint: "전환·USP",
    strategy: "performance_sales",
    pairing: "appliance",
    background: "cool_studio",
    palette: {
      primary: "#1f3a4d",
      secondary: "#9aa8b3",
      background: "#eef1f3",
      accent: "#2b5d73",
      text: "#12181c",
    },
  },
  problem_solution: {
    id: "problem_solution",
    label: "Problem Solution",
    hint: "문제 → 해결",
    strategy: "problem_solution",
    pairing: "default",
    background: "neutral_studio",
    palette: {
      primary: "#3d3a34",
      secondary: "#c2b8a8",
      background: "#f5f2eb",
      accent: "#6a5a3e",
      text: "#1b1915",
    },
  },
  technical_product: {
    id: "technical_product",
    label: "Technical Product",
    hint: "기능·스펙",
    strategy: "technical",
    pairing: "appliance",
    background: "graphite_studio",
    palette: {
      primary: "#2a2e33",
      secondary: "#8b939c",
      background: "#eceff1",
      accent: "#3d5a73",
      text: "#141618",
    },
  },
  lifestyle_commerce: {
    id: "lifestyle_commerce",
    label: "Lifestyle Commerce",
    hint: "사용 장면",
    strategy: "lifestyle",
    pairing: "cafe",
    background: "daylight_table",
    palette: {
      primary: "#5c4033",
      secondary: "#d2c0a8",
      background: "#f6f1ea",
      accent: "#7a5340",
      text: "#211814",
    },
  },
  bold_commercial: {
    id: "bold_commercial",
    label: "Bold Commercial",
    hint: "강한 메시지",
    strategy: "performance_sales",
    pairing: "default",
    background: "high_contrast_studio",
    palette: {
      primary: "#1a1a1a",
      secondary: "#d4c4a8",
      background: "#f2eee6",
      accent: "#9a3412",
      text: "#111111",
    },
  },
});

const BY_CATEGORY = Object.freeze({
  grocery: "studio_advertising",
  cafe: "lifestyle_commerce",
  beauty: "premium_editorial",
  appliance: "technical_product",
  furniture: "technical_product",
  salon: "problem_solution",
});

export function listDetailPageStylePresets() {
  return Object.values(DETAIL_PAGE_STYLE_PRESETS);
}

export function resolveDetailPageStylePreset(input = {}) {
  const raw = String(input.stylePreset || input.style || "").trim();
  if (DETAIL_PAGE_STYLE_PRESETS[raw]) return DETAIL_PAGE_STYLE_PRESETS[raw];
  const byLabel = Object.values(DETAIL_PAGE_STYLE_PRESETS).find(
    (p) => p.label === raw || p.id === raw
  );
  if (byLabel) return byLabel;
  const key = String(input.industry || input.category || "").toLowerCase();
  if (BY_CATEGORY[key]) return DETAIL_PAGE_STYLE_PRESETS[BY_CATEGORY[key]];
  if (/화장품|세럼|크림|스킨|뷰티/.test(`${input.productName || ""} ${input.industry || ""}`)) {
    return DETAIL_PAGE_STYLE_PRESETS.premium_editorial;
  }
  if (/가전|청정기|블렌더|청소기/.test(`${input.productName || ""} ${input.industry || ""}`)) {
    return DETAIL_PAGE_STYLE_PRESETS.technical_product;
  }
  if (/쌀|햅쌀|원두|식품/.test(`${input.productName || ""} ${input.industry || ""}`)) {
    return DETAIL_PAGE_STYLE_PRESETS.studio_advertising;
  }
  return DETAIL_PAGE_STYLE_PRESETS.studio_advertising;
}
