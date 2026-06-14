/**
 * 브랜드 습관 UX copy 회귀
 */
import assert from "node:assert/strict";
import {
  resolveBrandHabitStatusLine,
  isBrandHabitLearningActive,
  BRAND_HABIT_EMPTY_LINE,
} from "../lib/brands/brandHabitUx.js";

assert.equal(isBrandHabitLearningActive({ generations: 2 }), true);
assert.equal(isBrandHabitLearningActive({ feedback: 1 }), true);
assert.equal(isBrandHabitLearningActive({}), false);

assert.match(
  resolveBrandHabitStatusLine({ serverBrief: "친근한 톤" }),
  /친근한 톤/
);
assert.equal(
  resolveBrandHabitStatusLine({}),
  BRAND_HABIT_EMPTY_LINE
);

console.log("OK: brand-habit-ux");
