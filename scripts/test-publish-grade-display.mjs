/**
 * 발행 등급 A/B/C 회귀
 */
import assert from "node:assert/strict";
import {
  resolvePublishGrade,
  axisQualityLabel,
  PUBLISH_GRADE_A,
  PUBLISH_GRADE_C,
} from "../lib/product/publishGradeDisplay.js";

assert.equal(resolvePublishGrade({ publishScore: 90 }).id, PUBLISH_GRADE_A.id);
assert.equal(resolvePublishGrade({ publishScore: 75 }).id, "B");
assert.equal(resolvePublishGrade({ publishScore: 55 }).id, PUBLISH_GRADE_C.id);
assert.equal(axisQualityLabel(85), "우수");
assert.equal(axisQualityLabel(70), "보통");

console.log("OK: publish grade display");
