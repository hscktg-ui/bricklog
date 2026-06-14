import assert from "node:assert/strict";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { assertPreWriteVerified } from "../lib/content/v2PipelineGate.js";
import { ensureServerAxisResearch } from "../lib/generation/serverAxisResearch.js";
import { assertResearchFirstWritable } from "../lib/product/briclogResearchFirstPipeline.js";
import { assertResearchVerificationGate } from "../lib/evolution/researchVerificationGate.js";

const RAW = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const slimRaw = slimBlogApiPayload(RAW);
const blocked = assertPreWriteVerified(slimRaw);
assert.equal(blocked.ok, false, "raw API should fail topic_proof without research");
assert.match(blocked.userMessage || "", /29%|조사|정보/);

const axis = await ensureServerAxisResearch({ ...RAW });
assert.equal(axis.ok, true, `server axis should succeed: ${axis.userMessage}`);
assert.ok(axis.input.v2ResearchReady, "v2ResearchReady after server axis");
assert.ok((axis.input.researchFactCount || 0) >= 3, "facts after server axis");

const pre = assertPreWriteVerified(slimBlogApiPayload(axis.input));
assert.equal(pre.ok, true, `preWrite after axis: ${pre.userMessage}`);

const rf = assertResearchFirstWritable(axis.input);
assert.equal(rf.ok, true, `researchFirst: ${rf.userMessage} ${rf.reasons?.join(",")}`);

const verify = assertResearchVerificationGate(axis.input);
assert.equal(
  verify.reasons?.includes("high_prewrite_repetition"),
  false,
  "repetition should not block after client/server axis"
);

console.log("test-research-gate-rescue: OK");
