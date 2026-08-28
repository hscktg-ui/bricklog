import assert from "node:assert/strict";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import {
  DETAIL_PAGE_SUCCESS_PHASES,
  DETAIL_PAGE_SUCCESS_HARD_GATES,
  DETAIL_PAGE_SUCCESS_DOCTRINE,
  DETAIL_PAGE_SUCCESS_PASS_SCORE,
  assessDetailPageSuccess,
} from "../lib/product/detailPageSuccessStandard.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";

assert.equal(
  DETAIL_PAGE_SUCCESS_PHASES.reduce((s, p) => s + p.weight, 0),
  100
);
assert.equal(DETAIL_PAGE_SUCCESS_PHASES.length, 5);
assert.equal(DETAIL_PAGE_SUCCESS_HARD_GATES.length, 4);
assert.equal(DETAIL_PAGE_SUCCESS_PASS_SCORE, 80);
assert.equal(DETAIL_PAGE_SUCCESS_DOCTRINE.pass, "고르는 화면이 생겼다");
assert.equal(DETAIL_PAGE_PRODUCT.successOk.includes("고르는 화면"), true);

const pack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
});
assert.equal(pack._meta.sqv.score >= 95, true);
assert.equal(pack._meta.standard.ok, true);
assert.equal(pack._meta.success.ok, false, "95점 패딩 초안은 성공이 아니다");
assert.ok(
  pack._meta.success.hard.includes("pad") ||
    pack._meta.success.hard.includes("uniqueness") ||
    pack._meta.success.hard.includes("panel")
);
assert.equal(pack._meta.success.doctrine, DETAIL_PAGE_SUCCESS_DOCTRINE.fail);

const html = renderDetailPageBodyHtml(pack, []);
const live = assessDetailPageSuccess({
  pack,
  html,
  photoCount: 3,
  input: { brandName: "우리쌀가게" },
});
assert.equal(live.ok, false);
assert.equal(live.engineScore >= 95, true);
assert.ok(live.measured.padHits > 2);

console.log(
  `ok detail-page-success-standard engine=${pack._meta.sqv.score} success=${live.score} hard=${live.hard.join(",")}`
);
