/**
 * 발행 준비 단일 상태 SSOT
 */
import assert from "node:assert/strict";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay.js";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay.js";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack.js";

const readyPack = {
  sections: [{ body: "a" }],
  _meta: {
    publishReady: true,
    humanWritingDelivery: { humanReady: false, displayReady: false },
  },
};
assert.equal(resolvePublishReadiness(readyPack).status, "ready");

const polishingPack = {
  sections: [{ body: "a" }],
  _meta: { humanWritingDelivery: { humanReady: false, displayReady: true } },
};
assert.equal(resolvePublishReadiness(polishingPack).status, "polishing");

const bothReady = {
  sections: [{ body: "a" }],
  _meta: { humanWritingDelivery: { humanReady: true, displayReady: true } },
};
assert.equal(resolvePublishReadiness(bothReady).status, "ready");

const feedbackLine = formatFeedbackAppliedCustomerLine(
  ["remove_repetition"],
  ""
);
assert.ok(feedbackLine.includes("반복"));

console.log("OK: publish-readiness-display");
