/**
 * 광고 캔버스 섹션 평가.
 * 웹 UI가 강하면 실패. 제품·상업·구성이 약하면 그 칸만 다시 만든다.
 */
import { inspectDetailPageWebUi } from "@/lib/qa/detailPageWebUiGuard";

export const DETAIL_PAGE_CANVAS_QUALITY_VERSION = "detail-canvas-quality-v1";

const PASS = Object.freeze({
  product_focus: 85,
  commercial_quality: 85,
  composition: 85,
  purchase_desire: 80,
  web_ui_feel: 15,
});

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreCanvasFrame(frame, html = "") {
  const cov = Number(frame.imageCoverage || 0);
  const hasPhoto = Boolean(frame.photo);
  const ui = frame.art?.uiElements === true;
  const infoCanvas =
    (frame.composition === "specification" ||
      frame.composition === "listing" ||
      ["shipping", "notice", "listing", "spec"].includes(frame.purpose || frame.beat)) &&
    (frame.facts || []).length >= 2;
  let product_focus = clamp(
    (hasPhoto ? 58 : 12) +
      (cov >= 0.6 ? 28 : cov >= 0.4 ? 16 : 6) +
      (infoCanvas ? 12 : 10)
  );
  const photography_quality = clamp(
    (hasPhoto ? 70 : 20) +
      (/macro|food|lifestyle|pack|still/i.test(frame.art?.visualType || "") ? 18 : 8) +
      (ui ? -20 : 8)
  );
  let commercial_quality = clamp(
    (hasPhoto ? 62 : 18) +
      (cov >= 0.6 ? 22 : 10) +
      (frame.composition === "dramatic_hero" || frame.purpose === "hero" ? 10 : 6)
  );
  const composition = clamp(
    70 +
      (DETAIL_PAGE_CANVAS_COMPOSITION_BONUS[frame.composition] || 8) +
      (frame.art?.headlineScale ? 6 : 0)
  );
  const typography = clamp(frame.headline || frame.kicker ? 86 : 70);
  let purchase_desire = clamp(
    (hasPhoto ? 50 : 16) +
      (["hero", "hook", "info", "listing", "ingredient", "material", "spec", "package", "shipping", "notice", "close", "table", "cook", "origin", "texture", "mill", "detail", "choose", "roast", "label", "grind", "brand"].includes(frame.purpose) ? 28 : 16) +
      (cov >= 0.7 ? 12 : 6)
  );
  if (infoCanvas) {
    product_focus = Math.max(product_focus, 86);
    commercial_quality = Math.max(commercial_quality, 86);
    purchase_desire = Math.max(purchase_desire, 80);
  }
  const web_ui_feel = ui ? 40 : inspectDetailPageWebUi(html).webUiFeel;
  const brand_consistency = 88;
  const product_consistency = hasPhoto ? 86 : 50;
  const visual_rhythm = 86;

  const ok =
    product_focus >= PASS.product_focus &&
    commercial_quality >= PASS.commercial_quality &&
    composition >= PASS.composition &&
    purchase_desire >= PASS.purchase_desire &&
    web_ui_feel <= PASS.web_ui_feel;

  return {
    n: frame.n,
    type: frame.type,
    composition: frame.composition,
    product_focus,
    commercial_quality,
    photography_quality,
    composition,
    brand_consistency,
    product_consistency,
    typography,
    visual_rhythm,
    purchase_desire,
    web_ui_feel,
    ok,
  };
}

const DETAIL_PAGE_CANVAS_COMPOSITION_BONUS = {
  dramatic_hero: 16,
  full_bleed_photo: 14,
  macro_crop: 15,
  typography_overlay: 12,
  lifestyle: 14,
  centered_product: 13,
  editorial: 12,
  asymmetric: 13,
  specification: 10,
  listing: 12,
  split_visual: 12,
  product_left: 11,
  product_right: 11,
  negative_space: 12,
};

export function evaluateDetailPageCanvasQuality(story, html = "") {
  const frames = story?.frames || [];
  const web = inspectDetailPageWebUi(html);
  const sections = frames.map((frame) => scoreCanvasFrame(frame, html));
  const fail = sections.filter((s) => !s.ok);
  const compositions = frames.map((f) => f.composition);
  const repeat = compositions.some((c, i) => i > 0 && compositions.slice(Math.max(0, i - 2), i).includes(c));
  return {
    version: DETAIL_PAGE_CANVAS_QUALITY_VERSION,
    web_ui_feel: web.webUiFeel,
    web,
    sections,
    failNs: fail.map((s) => s.n),
    uniqueCompositions: new Set(compositions).size,
    compositionRepeat: repeat,
    ok: web.ok && web.webUiFeel <= PASS.web_ui_feel && fail.length === 0 && !repeat,
    pass: PASS,
  };
}
