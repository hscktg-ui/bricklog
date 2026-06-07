import assert from "node:assert/strict";
import {
  DEPTH_BENCHMARK,
  assessBriclogSurfaceDepth,
  formatDepthComparisonLine,
  overallToDepthLevel,
} from "@/lib/product/engineeringDepthLevels.js";

assert.equal(overallToDepthLevel(3.2), 3);
assert.ok(DEPTH_BENCHMARK.lens.overall < DEPTH_BENCHMARK.briclog.engineOverall);

const before = assessBriclogSurfaceDepth({});
assert.ok(before.surfaceOverall < DEPTH_BENCHMARK.briclog.targetSurfaceOverall);

const after = assessBriclogSurfaceDepth({
  hasContextScore: true,
  hasWorkspaceScore: true,
  hasPublicTest: true,
  hasMultiChannel: true,
  hasBrandMemory: true,
  generationReliable: true,
});
assert.ok(after.surfaceOverall >= DEPTH_BENCHMARK.lens.overall);
assert.ok(after.aheadOfLens);
assert.ok(after.level >= 4);

assert.ok(formatDepthComparisonLine().includes("Lens"));

console.log("OK: engineering depth", formatDepthComparisonLine());
console.log("  surface after improvements:", after.surfaceOverall, after.levelLabel);
