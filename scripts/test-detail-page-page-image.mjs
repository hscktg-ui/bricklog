/**
 * 상세는 이미지 — PNG 검사 + 디자이너 hire는 페이지 이미지를 본 뒤
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  inspectPngBuffer,
  inspectDetailPageScreenshots,
} from "../lib/qa/detailPagePageImage.js";
import { DETAIL_PAGE_IMAGE_DESIGNER, DETAIL_PAGE_DESIGNER_VISION_MIN } from "../lib/qa/detailPageDesignerVision.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import { evaluateDetailPageDesignerPanel } from "../lib/qa/detailPageDesignerPanel30.js";
import { assessDetailPageSuccess } from "../lib/product/detailPageSuccessStandard.js";
import { detailPageSamplePageSrc } from "../lib/product/detailPageCompanyPresets.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";

assert.equal(DETAIL_PAGE_IMAGE_DESIGNER.job.includes("상세페이지 디자이너"), true);
assert.equal(DETAIL_PAGE_DESIGNER_VISION_MIN, 90);
assert.ok(DETAIL_PAGE_PRODUCT.versusUs.includes("이미지"));
assert.equal(detailPageSamplePageSrc("open-rice"), "/detail-sample/open-rice-page-hero.png");
assert.equal(
  detailPageSamplePageSrc("open-beans", "full"),
  "/detail-sample/open-beans-page-full.png"
);

const TINY =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
assert.equal(inspectPngBuffer(TINY).ok, false);

const heroPath = "public/detail-sample/open-rice-page-hero.png";
assert.ok(existsSync(heroPath), "generate:detail-page-page-images first");
const hero = readFileSync(heroPath);
assert.equal(inspectPngBuffer(hero).ok, true, JSON.stringify(inspectPngBuffer(hero)));
assert.ok(inspectPngBuffer(hero).width >= 800);

const pack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  industry: "쌀가게",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
});
const html = renderDetailPageBodyHtml(pack, []);
const seen = evaluateDetailPageDesignerPanel({
  pack,
  html,
  photoCount: 3,
  screenshots: { hero },
});
assert.equal(seen.measured.lookedAtImage, true);
assert.equal(seen.summary.hire, true);

const success = assessDetailPageSuccess({
  pack,
  html,
  photoCount: 3,
  screenshots: { hero },
  requirePageImage: true,
});
assert.equal(success.ok, true, success.hard.join(","));
assert.equal(success.hard.includes("page_image"), false);

const inspected = inspectDetailPageScreenshots({ hero });
assert.equal(inspected.ok, true);

console.log(
  `ok detail-page-page-image ${inspectPngBuffer(hero).width}x${inspectPngBuffer(hero).height} hire=${seen.summary.hire}`
);
