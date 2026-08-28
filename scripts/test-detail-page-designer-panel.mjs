import assert from "node:assert/strict";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import {
  DETAIL_PAGE_DESIGNER_PANEL_30,
  evaluateDetailPageDesignerPanel,
} from "../lib/qa/detailPageDesignerPanel30.js";

assert.equal(DETAIL_PAGE_DESIGNER_PANEL_30.length, 30);
assert.equal(new Set(DETAIL_PAGE_DESIGNER_PANEL_30.map((d) => d.id)).size, 30);

const pack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
});
const html = renderDetailPageBodyHtml(pack, []);
const panel = evaluateDetailPageDesignerPanel({ pack, html, photoCount: 0 });
assert.equal(panel.votes.length, 30);
assert.equal(panel.measured.padHits <= 2, true);
assert.ok(panel.summary.mean >= 70, `designer mean ${panel.summary.mean}`);
assert.equal(panel.summary.n, 30);
assert.ok(panel.summary.mean >= 1 && panel.summary.mean <= 100);
console.log(
  `ok detail-page-designer-panel mean=${panel.summary.mean} pass=${panel.summary.passCount}/30 pad=${panel.measured.padHits}`
);
