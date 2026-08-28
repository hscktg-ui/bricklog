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
  highlights: ["당일 도정", "진공 포장", "여주 수확"],
  pageLength: "standard",
});
const TINY =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const shots = [
  { src: TINY, slot: "hero", caption: "포장 앞면" },
  { src: TINY, slot: "observe", caption: "손에 쥐거나 가까이" },
  { src: TINY, slot: "feature", caption: "디테일 한 점" },
];
const html = renderDetailPageBodyHtml(pack, shots);
const panel = evaluateDetailPageDesignerPanel({
  pack,
  html,
  photoCount: shots.length,
});
assert.equal(panel.votes.length, 30);
assert.ok(html.includes('data-layout="choose-steps"'));
assert.ok(html.includes('data-layout="points-5"'));
assert.ok((html.match(/data-role="lead"/g) || []).length <= 8);
assert.ok(panel.summary.passCount >= 30, `pass ${panel.summary.passCount}/30`);
assert.equal(panel.summary.n, 30);
assert.ok(panel.summary.mean >= 97, `panel mean ${panel.summary.mean}`);
assert.ok(panel.summary.mean <= 99);
assert.equal(panel.summary.hire, false, "HTML만 보면 출고하지 않는다");
assert.equal(panel.measured.lookedAtImage, false);
console.log(
  `ok detail-page-designer-panel mean=${panel.summary.mean} pass=${panel.summary.passCount}/30 pad=${panel.measured.padHits}`
);
