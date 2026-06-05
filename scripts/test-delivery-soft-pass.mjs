import assert from "node:assert/strict";
import {
  isSoftInformationGateFailure,
  hasFilledBlogAxes,
  deliverBlogDespiteGate,
} from "../lib/product/deliverySoftPass.js";
import { assertPostWriteDeliverable } from "../lib/content/v2PipelineGate.js";
import { resolveBlogUiDelivery } from "../lib/generation/postVerifySalvage.js";
import { buildDeliverableBlogFallback, enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";

const input = enrichMinimalBlogInput({
  brandName: "꽃집 노을",
  region: "강릉",
  topic: "졸업식 하회전 꽃다발",
  industry: "꽃/플로리스트",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});
Object.assign(input, prepareBriclogPreWriteContext(input));
input.v2PreWriteVerified = true;
input.knowledgeExpansionReady = true;

const { pack } = buildDeliverableBlogFallback({ input, failures: ["soft_pass_test"] });

assert.ok(hasFilledBlogAxes(input), "axes filled");
assert.ok(
  isSoftInformationGateFailure({
    reasons: ["topic_dominance_low", "information_yield_low"],
  }),
  "soft info gate"
);

const gate = assertPostWriteDeliverable(input, pack);
const delivery = resolveBlogUiDelivery(pack, input, { withheld: false });

assert.ok(
  gate.ok || delivery.ok,
  `expected deliverable gate or UI delivery ok gate=${gate.ok} delivery=${delivery.ok}`
);

const softPreview = deliverBlogDespiteGate(input, pack, {
  reasons: ["topic_dominance_low", "information_yield_low"],
});
assert.ok(
  softPreview?.blogContent?.sections?.length,
  "soft info gate should preview deliver"
);

console.log("delivery-soft-pass OK");
