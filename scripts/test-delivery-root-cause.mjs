/**
 * 완성 글 미표시 — 차단 경로 재현
 */
import assert from "node:assert/strict";
import {
  assertPostWriteDeliverable,
  blockUnverifiedBlogApiResponse,
  researchGateBlockedResult,
} from "../lib/content/v2PipelineGate.js";
import { gateOrchestratorBlogPack } from "../lib/llm/orchestratorDeliveryGate.js";
import { buildDeliverableBlogFallback, enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { isLengthOnlyGateSoft } from "../lib/product/missionFlags.js";

const input = enrichMinimalBlogInput({
  brandName: "꽃집 노을",
  region: "강릉",
  topic: "졸업식 하회전 꽃다발",
  industry: "꽃/플로리스트",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
});
Object.assign(input, prepareBriclogPreWriteContext(input));
input.v2PreWriteVerified = true;

const { pack } = buildDeliverableBlogFallback({
  input,
  failures: ["root_cause_probe"],
});

assert.ok(pack?.sections?.length, "fallback pack has sections");

const softGate = {
  ok: false,
  stage: "beta_test_guard",
  reasons: ["topic_dominance_low", "information_yield_low"],
  userMessage:
    "아직 올리지 않았어요. 주제만 반복하고 정보가 부족해요 · 새로운 정보가 부족해요.",
};

const blockedApi = blockUnverifiedBlogApiResponse(
  { ok: true, blogContent: pack, mode: "llm" },
  input
);
const hardReasons = (assertPostWriteDeliverable(input, pack).reasons || []).filter(
  (r) =>
    r === "outline_only_output" ||
    r === "internal_prompt_leak" ||
    (!isLengthOnlyGateSoft() &&
      (r === "length_tier_under" || r === "length_tier_over"))
);
if (hardReasons.length) {
  assert.equal(blockedApi.withheld, true, "hard outline/length/leak should withhold");
  assert.equal(blockedApi.blogContent, null);
} else {
  assert.ok(
    blockedApi.blogContent?.sections?.length,
    `API block should keep blog on soft fail (withheld=${blockedApi.withheld})`
  );
}

const gated = gateOrchestratorBlogPack(input, pack, {
  mode: "draft_fallback",
  llmAvailable: true,
});
if (hardReasons.length) {
  assert.equal(gated.withheld, true, "hard-fail pack should withhold in orchestrator");
} else {
  assert.ok(
    gated.blogContent?.sections?.length,
    "orchestrator gate should keep blog when preview allowed"
  );
}

const research = researchGateBlockedResult(input, softGate, pack);
assert.ok(
  research.blogContent?.sections?.length,
  "researchGateBlocked must pass pack through preview on soft gate"
);
assert.equal(research.withheld, false);

console.log("delivery-root-cause OK — soft withhold paths deliver preview");
