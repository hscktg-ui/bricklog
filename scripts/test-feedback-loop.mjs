/**
 * 피드백 의도 · 엔진 루프 회귀
 */
import assert from "node:assert/strict";
import { buildRewriteFromFeedback } from "@/lib/feedback/buildRewriteFromFeedback.js";
import {
  formatFeedbackIntentBrief,
  insightsFromFeedbackIntents,
  buildFeedbackRegenDirective,
} from "@/lib/feedback/feedbackIntentEngine.js";
const built = buildRewriteFromFeedback({
  reaction: "bad",
  tags: ["too_ad", "low_info"],
  memo: "광고 같아요 너무 짧아요",
  channel: "blog",
});

assert.ok(built.shouldRewrite);
assert.ok(built.inputPatch.feedbackHints?.includes("reduce_ad_tone"));
assert.ok(built.inputPatch.feedbackHints?.includes("add_information_units"));
assert.ok(!built.feedbackText.includes("광고 같아요"));

const brief = formatFeedbackIntentBrief(built.inputPatch.feedbackHints, built.feedbackText);
assert.ok(brief.includes("수정 방향"));

const directive = buildFeedbackRegenDirective(built.inputPatch.feedbackHints, built.feedbackText);
assert.ok(directive.includes("본문에 넣지"));

const insights = insightsFromFeedbackIntents(built.inputPatch.feedbackHints);
assert.ok(insights.length >= 2);

console.log("OK feedback loop");
console.log("intents:", built.inputPatch.feedbackHints.join(", "));
