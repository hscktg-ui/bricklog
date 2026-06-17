import assert from "node:assert/strict";
import {
  enrichGenerationInput,
  applyRegenVariation,
  stampChannelRewriteMeta,
} from "../lib/workspace/enrichGenerationInput.js";

const brand = {
  brandName: "모카",
  tone: "emotional",
  includePhrases: "직접 로스팅",
  forbiddenWords: "최고",
};

const base = enrichGenerationInput(
  { brandName: "모카", topic: "원두", toneRequest: "담백하게" },
  { activeBrand: brand, activeBrandId: "b1" },
  {}
);

assert.ok(base.brandHabitsBrief?.includes("직접 로스팅"));
assert.ok(base.userToneBrief?.includes("담백"));
assert.ok(base.brandFeedbackBrief?.includes("사용자 톤 요청"));

const regen = enrichGenerationInput(
  { brandName: "모카", topic: "원두", toneRequest: "짧게" },
  { activeBrand: brand },
  { regen: true, priorRewriteCount: 1, channel: "blog" }
);

assert.equal(regen.rewriteCount, 2);
assert.ok(regen.brandFeedbackBrief?.includes("다시 받기 2회차"));
assert.ok(regen.feedbackHints?.includes("restructure_sections"));

const placeRegen = applyRegenVariation(
  { brandName: "모카" },
  { priorRewriteCount: 0, channel: "place" }
);
assert.equal(placeRegen.rewriteCount, 1);
assert.ok(placeRegen.brandFeedbackBrief?.includes("플레이스"));

const stamped = stampChannelRewriteMeta({ title: "t" }, 2);
assert.equal(stamped._meta.rewriteCount, 2);

console.log("OK: enrich-generation-input");
