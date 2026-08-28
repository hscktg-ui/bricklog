/**
 * 지는 축 3개 — 브릭로그 방식으로 이기게 마련됐는지
 */
import assert from "node:assert/strict";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml, wrapMallHtml, wrapDetailPageImageStackHtml } from "../lib/product/detailPageHtml.js";
import { DETAIL_PAGE_WIDTH } from "../lib/product/detailPageCatalog.js";
import {
  DETAIL_PAGE_COMPETE_WINS,
  DETAIL_PAGE_MALLS,
  assessDetailPageCompeteWins,
  assertProductShotWin,
} from "../lib/product/detailPageCompeteWins.js";
import { DETAIL_PAGE_PHOTO_DIRECTION } from "../lib/product/detailPagePhotos.js";

assert.equal(DETAIL_PAGE_COMPETE_WINS.length, 3);
assert.equal(DETAIL_PAGE_MALLS.length, 2);
assert.equal(DETAIL_PAGE_MALLS[0].id, "smartstore");
assert.equal(DETAIL_PAGE_MALLS[1].id, "coupang");
assert.ok(DETAIL_PAGE_MALLS.every((m) => m.steps.some((s) => s.includes("이미지를 위에서부터"))));
assert.equal(assertProductShotWin(), true);
assert.ok(DETAIL_PAGE_PHOTO_DIRECTION.hero.shot.includes("포장"));

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
const html = renderDetailPageBodyHtml(pack, []);
const smart = wrapMallHtml(html, pack, "smartstore");
const coupang = wrapMallHtml(html, pack, "coupang");

const live = assessDetailPageCompeteWins({ html, wrapHtml: smart });
assert.equal(live.ok, true, live.checks.filter((c) => !c.ok).map((c) => c.id).join(","));
assert.equal(live.productShots, true);
assert.ok(html.includes('data-photo-direction="hero"'));
assert.ok(html.includes('data-visual="first-glance"'));
assert.ok(smart.includes('data-mall="smartstore"'));
assert.ok(coupang.includes('data-mall="coupang"'));
assert.equal(smart.includes("image_generation"), false);

const stackHtml = wrapDetailPageImageStackHtml(
  [{ src: "/detail-sample/open-rice-page-full.png", alt: "여주 햅쌀 10kg" }],
  pack,
  "smartstore"
);
assert.ok(stackHtml.includes('data-deliverable="image-stack"'));
assert.ok(stackHtml.includes("<img "));
assert.equal(stackHtml.includes('data-layout="hero-stack"'), false);
const stacked = assessDetailPageCompeteWins({ html, wrapHtml: stackHtml });
assert.equal(stacked.ok, true, stacked.checks.filter((c) => !c.ok).map((c) => c.id).join(","));

console.log(
  `ok detail-page-compete-wins ${live.checks.map((c) => c.id).join("·")} malls=${live.malls.join(",")}`
);
