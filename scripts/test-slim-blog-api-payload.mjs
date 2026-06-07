import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  slimBlogApiPayload,
  estimateJsonBytes,
} from "@/lib/generation/slimBlogApiPayload.js";
import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "@/lib/workspace/brandFormSync.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const p = mergeWorkspaceBrandIntoInput({
  brandName: "테스트카페",
  region: "서울 강남",
  topic: "봄 브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});

await applyV2AxisResearch({
  pipelineInput: p,
  generateResearchAsync: async () => ({
    research: { summary: "테스트", sources: [], v2Axis: {} },
  }),
  onStep: () => {},
});

const fullBytes = estimateJsonBytes(p);
const slim = slimBlogApiPayload(p);
const slimBytes = estimateJsonBytes(slim);

assert.ok(fullBytes > 40_000, `full should be large: ${fullBytes}`);
assert.ok(slimBytes < 80_000, `slim should be small: ${slimBytes}`);
assert.ok(slimBytes < fullBytes / 2);
assert.equal(slim.researchPayload, undefined);
assert.ok(slim.researchFacts?.length >= 1);
assert.ok(slim.v2ResearchReady);
assert.ok(slim.brandName);

console.log("OK: slim blog api payload", fullBytes, "→", slimBytes);
