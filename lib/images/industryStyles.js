/** 업종별 마케팅 이미지 스타일 힌트 */
export const INDUSTRY_IMAGE_STYLES = {
  꽃집: {
    palette: "soft pastels, fresh greens, natural florals",
    mood: "warm seasonal, gift-ready bouquets",
    props: "ribbon, wrapping paper, seasonal blooms",
  },
  카페: {
    palette: "warm beige, cream, coffee brown accents",
    mood: "cozy lifestyle, morning light",
    props: "latte art, pastry, wooden table",
  },
  병원: {
    palette: "clean white, calm blue-green, trustworthy",
    mood: "professional calm, no dramatic medical scenes",
    props: "reception warmth, wellness consultation",
  },
  미용실: {
    palette: "neutral salon interior, soft highlights",
    mood: "premium grooming, before-after subtle",
    props: "styling tools, mirror reflection",
  },
  학원: {
    palette: "bright friendly, educational trust",
    mood: "focused learning, parent-friendly",
    props: "desk, books, welcoming classroom",
  },
  음식점: {
    palette: "appetizing warm tones, food hero",
    mood: "local dining, fresh ingredients",
    props: "signature dish, table setting",
  },
  베이커리: {
    palette: "golden crust, bakery display",
    mood: "fresh baked morning",
    props: "bread rack, pastry case",
  },
  펜션: {
    palette: "nature retreat, soft sunset",
    mood: "getaway relaxation",
    props: "room view, outdoor deck",
  },
};

export function getIndustryStyle(industry) {
  const key = String(industry || "").trim();
  if (INDUSTRY_IMAGE_STYLES[key]) return INDUSTRY_IMAGE_STYLES[key];
  for (const [k, v] of Object.entries(INDUSTRY_IMAGE_STYLES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return {
    palette: "clean white tone, Korean local business",
    mood: "trustworthy approachable premium",
    props: "storefront or product hero",
  };
}
