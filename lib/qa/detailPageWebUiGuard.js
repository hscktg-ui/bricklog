/**
 * 상세가 웹사이트/랜딩/SaaS처럼 보이면 실패.
 * web_ui_feel이 높으면 출고하지 않는다.
 */
export const DETAIL_PAGE_WEB_UI_GUARD_VERSION = "detail-web-ui-v1";

const PATTERNS = [
  { id: "cta_button", re: /<button\b|role="button"|cursor:pointer/i, weight: 22 },
  { id: "navigation", re: /<nav\b|data-nav=|navbar/i, weight: 24 },
  { id: "header_footer", re: /<header\b|<footer\b/i, weight: 18 },
  { id: "browser_mockup", re: /browser frame|safari chrome|app screenshot/i, weight: 20 },
  { id: "three_column", re: /data-layout="choose-steps"|grid-template-columns:\s*repeat\(3/i, weight: 18 },
  { id: "usp_cards", re: /data-layout="usp-cards"/i, weight: 16 },
  { id: "icon_grid", re: /border-radius:999px|icon-circle|feature-icon/i, weight: 14 },
  { id: "pricing_cards", re: /pricing card|요금제|월 구독/i, weight: 16 },
  { id: "testimonial", re: /testimonial|실구매자 후기|별점/i, weight: 20 },
  { id: "saas_hero", re: /data-layout="website-hero"|Get started|무료로 시작/i, weight: 18 },
];

export function inspectDetailPageWebUi(html = "") {
  const source = String(html || "");
  const hits = [];
  let score = 0;
  for (const p of PATTERNS) {
    if (p.re.test(source)) {
      hits.push(p.id);
      score += p.weight;
    }
  }
  const webUiFeel = Math.min(100, score);
  return {
    version: DETAIL_PAGE_WEB_UI_GUARD_VERSION,
    hits,
    webUiFeel,
    ok: webUiFeel < 20 && !hits.includes("cta_button") && !hits.includes("navigation"),
  };
}

export function scoreDetailPageVisualCritic(html = "", extra = {}) {
  const web = inspectDetailPageWebUi(html);
  const source = String(html || "");
  const imageDominant =
    (source.match(/data-photo-slot=/g) || []).length >= 2 &&
    source.includes('data-image-ratio=');
  const productFocus = source.includes('data-deliverable="mall-image"') ? 90 : 40;
  return {
    version: DETAIL_PAGE_WEB_UI_GUARD_VERSION,
    web_ui_feel: web.webUiFeel,
    product_focus: productFocus,
    visual_quality: imageDominant ? 88 : 62,
    composition_quality: source.includes("data-composition=") ? 86 : 50,
    brand_consistency: extra.preset ? 88 : 70,
    product_consistency: extra.photos >= 1 ? 86 : 55,
    typography_quality: source.includes("data-type=") ? 86 : 60,
    commercial_quality: source.includes("data-mall-ready") ? 88 : 60,
    section_repetition: extra.uniqueCompositions ? 90 : 60,
    visual_rhythm: extra.uniqueCompositions ? 88 : 58,
    web,
    ok:
      web.ok &&
      productFocus >= 85 &&
      web.webUiFeel < 20,
  };
}
