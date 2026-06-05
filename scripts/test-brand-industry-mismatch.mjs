import assert from "node:assert/strict";
import { detectBrandIndustryMismatch } from "../lib/product/brandIndustryMismatch.js";

const bad = detectBrandIndustryMismatch({
  brandName: "멍멍살롱",
  topic: "여름철 반려견 미용",
  industry: "숙박",
});
assert.ok(bad.mismatch);
assert.match(bad.message, /반려|미용/);

const ok = detectBrandIndustryMismatch({
  brandName: "멍멍살롱",
  topic: "반려견 미용",
  industry: "애견미용",
});
assert.ok(!ok.mismatch);

const marketing = detectBrandIndustryMismatch({
  brandName: "해신기획",
  topic: "블로그 마케팅",
  industry: "카페",
});
assert.ok(marketing.mismatch);
assert.match(marketing.message, /마케팅/);

console.log("OK: brand industry mismatch detection");
