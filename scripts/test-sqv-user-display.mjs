/**
 * 글값 사용자 표시 — 내부 reason 코드 미노출
 */
import assert from "node:assert/strict";
import {
  buildSqUserDiagnostic,
  formatSqUserHint,
  translateSqReason,
} from "../lib/product/sqvUserDisplay.js";

const hint = formatSqUserHint(
  {
    score: 62,
    grade: "C",
    reasons: ["human_belief_low", "not_explainable"],
  },
  {}
);
assert.ok(!hint.includes("human_belief_low"), hint);
assert.ok(!hint.includes("글값"), hint);
assert.ok(hint.includes("말투") || hint.includes("다시"), hint);

const tips = translateSqReason("persona_misaligned");
assert.equal(tips, "브랜드·화자 톤을 맞추는 중");

const diag = buildSqUserDiagnostic({
  _meta: {
    contentQualityValue: 82,
    sqv: { score: 82, grade: "B", reasons: ["length_tier_under"] },
    publishReady: true,
  },
});
assert.ok(diag.label.includes("올리기 좋음"), diag.label);
assert.ok(!diag.label.includes("글값"), diag.label);
assert.ok(!diag.hint.includes("length_tier_under"), diag.hint);

console.log("OK: sqv user display — friendly hints, no internal codes");
