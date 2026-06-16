/**
 * Self-evolution v2 — 지표·보류·인사이트 패치 회귀
 */
import assert from "node:assert/strict";
import { evaluateInsightAutoApply } from "@/lib/feedback/humanOverrideEngine.js";
import { buildEvolutionPatchFromInsight } from "@/lib/evolution-lab/insightToRules.js";
import { gatherInsightPerformanceMetrics } from "@/lib/feedback/insightPerformanceMetrics.js";

const smallSample = evaluateInsightAutoApply(
  { insight_type: "ad_tone_guard" },
  { sampleSize: 3 }
);
assert.equal(smallSample.apply, false);
assert.equal(smallSample.reason, "sample_too_small");

const strongConv = evaluateInsightAutoApply(
  { insight_type: "rewrite_vs_copy" },
  { sampleSize: 20, conversionRate: 0.08, avgDwellSeconds: 40 }
);
assert.equal(strongConv.apply, true);
assert.equal(strongConv.reason, "strong_conversion_support");

const weakPerf = evaluateInsightAutoApply(
  { insight_type: "ai_cliche_threshold" },
  { sampleSize: 30, conversionRate: 0.01, avgDwellSeconds: 10 }
);
assert.equal(weakPerf.apply, false);
assert.equal(weakPerf.reason, "human_override_weak_performance");

for (const type of ["brand_voice", "search_intent", "density_over_length"]) {
  const patch = buildEvolutionPatchFromInsight({
    insight_type: type,
    payload: { message: `test ${type}` },
  });
  assert.ok(patch, `patch for ${type}`);
  assert.ok(
    patch["quality_rules.json"]?.naverBlogHints?.length ||
      patch["prompt_rules.json"]?.evolutionNotes?.length,
    `hints for ${type}`
  );
}

const metrics = await gatherInsightPerformanceMetrics(null);
assert.ok(metrics);
assert.equal(typeof metrics.sampleSize, "number");

console.log("OK insight auto-approve loop v2");
console.log("  metrics sampleSize:", metrics.sampleSize);
console.log("  supported types: brand_voice, search_intent, density_over_length");
