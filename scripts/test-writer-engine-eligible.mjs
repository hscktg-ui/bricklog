/**
 * Writer Engine eligibility — mission fallback + shrink guard severe
 */
import assert from "node:assert/strict";
import {
  isWriterEngineEligiblePack,
  isMissionFallbackPack,
} from "../lib/product/briclogWriterEngine.js";
import { guardPackAgainstShrink } from "../lib/product/packShrinkGuard.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const fallbackPack = {
  title: "테스트",
  sections: [
    { heading: "a", body: "가".repeat(400) },
    { heading: "b", body: "나".repeat(400) },
    { heading: "c", body: "다".repeat(400) },
  ],
  _meta: { missionProseFallback: true, generationMode: "mission_prose_fallback" },
};

assert.equal(isWriterEngineEligiblePack(fallbackPack), true);
assert.equal(isMissionFallbackPack(fallbackPack), true);
assert.equal(
  isWriterEngineEligiblePack(fallbackPack, { mode: "research_gate_stamped" }),
  true
);
assert.equal(
  isWriterEngineEligiblePack({ sections: [{ heading: "x", body: "y" }] }),
  false
);

const inbound = {
  sections: [{ heading: "h", body: "본문 ".repeat(200) }],
};
const shredded = {
  sections: [{ heading: "h", body: "짧음" }],
};
const guarded = guardPackAgainstShrink(inbound, shredded, {
  stage: "test_severe",
});
assert.equal(countBlogBodyCharsWithSpaces(guarded), countBlogBodyCharsWithSpaces(inbound));
assert.ok(guarded._meta?.shrinkGuardSevereAttempt);
assert.ok(guarded._meta?.shrinkGuardRollback);

console.log("OK: writer-engine-eligible", {
  severe: guarded._meta?.shrinkGuardDropRatio,
});
