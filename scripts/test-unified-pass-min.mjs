/**
 * unified passMin SSOT
 */
import assert from "node:assert/strict";
import { resolveUnifiedDeliveryPassMin, UNIFIED_DELIVERY_PASS_MIN } from "../lib/product/unifiedDeliveryPassMin.js";
import { resolveVisitReviewPassMin } from "../lib/product/visitReviewBenchmarkRubric.js";
import { assessUnifiedBlogDelivery } from "../lib/product/unifiedDeliveryGate.js";

process.env.BRICLOG_RESET_QUALITY = "true";

assert.equal(UNIFIED_DELIVERY_PASS_MIN, 85);
assert.equal(resolveUnifiedDeliveryPassMin(), 85);
assert.equal(resolveVisitReviewPassMin(), 85);

const pack = {
  sections: Array.from({ length: 7 }, (_, i) => ({
    heading: `섹션 ${i + 1}`,
    body: "전주 한옥마을 산책카페에서 루프탑 뷰와 수제 베이글을 직접 확인해 보면 현장 감각이 분명합니다. ".repeat(8),
  })),
  _meta: {
    columnistSovereignLlm: true,
    visitReviewBenchmarkOk: true,
    visitReviewBenchmark: { score: 88, grade: "A-", publishOk: true, hardFails: [] },
    contentEvaluation: { pass: true, score: 88, columnistBenchmark: true },
  },
};

const u = assessUnifiedBlogDelivery(pack, {
  brandName: "산책카페",
  region: "전주",
  topic: "브런치",
});
assert.equal(u.pass, true, "88 >= unified 85 passMin");

console.log("OK unified-pass-min");
