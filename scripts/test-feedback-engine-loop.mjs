/**
 * 피드백 → 전역 엔진 패치 매핑 스모크
 */
import assert from "node:assert/strict";
import { buildEvolutionPatchFromInsight } from "../lib/evolution-lab/insightToRules.js";
import {
  isAutoEvolveFromFeedbackEnabled,
  isFriendBetaLearningMode,
} from "../lib/config/engineEvolutionFlags.js";

const patch = buildEvolutionPatchFromInsight({
  insight_type: "ai_cliche_threshold",
  payload: { message: "test" },
});
assert.ok(patch["prompt_rules.json"]?.forbiddenPhrases?.length, "prompt patch");
assert.ok(patch["quality_rules.json"]?.naverBlogHints?.length, "quality patch");

assert.equal(typeof isAutoEvolveFromFeedbackEnabled(), "boolean");
assert.equal(typeof isFriendBetaLearningMode(), "boolean");

console.log("OK: feedback engine loop mapping");
