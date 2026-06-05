/**
 * 검수 withhold 메시지가 나와도 편집본이 배달되는지 — ensureBlogDelivery 통합
 */
import assert from "node:assert/strict";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import {
  forceLocalBlogPreviewDelivery,
} from "../lib/generation/ensureBlogDelivery.js";
import {
  assertPostWriteDeliverable,
  blockUnverifiedBlogApiResponse,
} from "../lib/content/v2PipelineGate.js";
import { buildDeliverableBlogFallback } from "../lib/llm/blogDeliveryFallback.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { salvageBlogPackForDelivery } from "../lib/generation/postVerifySalvage.js";
import { runPostVerifyWithAutoRetry } from "../lib/generation/postVerifyWithRetry.js";
import { formatPostVerifyUserMessage } from "../lib/product/customerOutput.js";

const baseInput = enrichMinimalBlogInput({
  brandName: "꽃집 노을",
  region: "강릉",
  topic: "졸업식 하회전 꽃다발",
  industry: "꽃/플로리스트",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
});
Object.assign(baseInput, prepareBriclogPreWriteContext(baseInput));
baseInput.v2PreWriteVerified = true;
baseInput.v2ResearchReady = true;
baseInput.knowledgeExpansionReady = true;

const { pack } = buildDeliverableBlogFallback({
  input: baseInput,
  failures: ["withhold_integration"],
});

assert.ok(pack?.sections?.length, "pack exists");

const gate = assertPostWriteDeliverable(baseInput, pack);
const withholdMsg = formatPostVerifyUserMessage(gate);
assert.ok(withholdMsg?.includes("아직 올리지 않"), `expected withhold copy got: ${withholdMsg}`);

const salvaged = salvageBlogPackForDelivery(pack, baseInput);
const verify = runPostVerifyWithAutoRetry(baseInput, salvaged);
assert.ok(
  verify.ok && verify.pack?.sections?.length,
  `postVerify must deliver preview (ok=${verify.ok})`
);

const preview = deliverBlogDespiteGate(baseInput, salvaged, gate, {
  mode: "integration_test",
});
assert.ok(
  preview?.blogContent?.sections?.length,
  "deliverBlogDespiteGate must return pack"
);
assert.equal(preview.withheld, false);

const api = blockUnverifiedBlogApiResponse(
  { ok: true, blogContent: salvaged, mode: "llm" },
  baseInput
);
assert.ok(
  api.blogContent?.sections?.length,
  `API block must keep blog (withheld=${api.withheld})`
);

const local = forceLocalBlogPreviewDelivery(baseInput, {
  ok: false,
  blogContent: null,
  userMessage: withholdMsg,
});
assert.ok(
  local?.blogContent?.sections?.length,
  "forceLocalBlogPreviewDelivery must rescue empty API result"
);
assert.equal(local.withheld, false);

console.log("ensure-blog-withhold-integration OK");
console.log("  withhold message (shown as hint only):", withholdMsg?.slice(0, 60) + "…");
console.log("  delivered sections:", local.blogContent.sections.length);
