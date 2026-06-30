/**
 * Columnist 실패 진단 SSOT 회귀
 */
import assert from "node:assert/strict";
import {
  diagnoseColumnistPackFailure,
} from "../lib/product/columnistSovereignEngine.js";

process.env.BRICLOG_RESET_QUALITY = "true";

const thinPack = {
  title: "테스트",
  sections: [
    { heading: "하나", body: "짧은 본문." },
    { heading: "둘", body: "또 짧음." },
  ],
};

const fail = diagnoseColumnistPackFailure(thinPack, {
  brandName: "금성침대",
  region: "김포",
  topic: "매트리스 체험",
  blogLengthTier: "short",
}, { fast: true, stage: "tier" });

assert.ok(fail, "thin pack should fail tier");
assert.ok(
  ["sections_low", "bench_publish_fail", "chars_below_sla_floor", "tier_reject"].includes(fail.code),
  `code: ${fail.code}`
);
assert.equal(fail.fast, true);

console.log("OK columnist-failure-diagnostic");
