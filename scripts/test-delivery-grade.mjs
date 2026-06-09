import assert from "node:assert/strict";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "../lib/constants.js";
import {
  assessDeliveryGrade,
  DELIVERY_GRADE,
  stampDeliveryGradeMeta,
} from "../lib/product/deliveryGrade.js";
import { guardPackAgainstShrink } from "../lib/product/packShrinkGuard.js";
import { hasSubstantiveLlmBody } from "../lib/product/contentQualityDelivery.js";

assert.equal(DEFAULT_BLOG_LENGTH_TIER, "short");
assert.equal(resolveBlogLengthTier().target, 2000);

const shortPack = {
  title: "테스트",
  sections: [
    { heading: "a", body: "가".repeat(700) },
    { heading: "b", body: "나".repeat(700) },
    { heading: "c", body: "다".repeat(700) },
  ],
  _meta: {},
};
const g = assessDeliveryGrade(shortPack, { blogLengthTier: "short" });
assert.equal(g.grade, DELIVERY_GRADE.HUMAN, "2100 chars should be human");
assert.ok(g.tierMet);

const tiny = {
  sections: [{ heading: "a", body: "짧은 본문".repeat(5) }],
  _meta: { deliveryRescue: true },
};
const draft = assessDeliveryGrade(tiny, { blogLengthTier: "short" });
assert.equal(draft.grade, DELIVERY_GRADE.DRAFT);

assert.ok(!hasSubstantiveLlmBody(tiny, { blogLengthTier: "short" }));
assert.ok(hasSubstantiveLlmBody(shortPack, { blogLengthTier: "short" }));

const inbound = {
  sections: [{ heading: "a", body: "x".repeat(2000) }],
};
const outbound = { sections: [{ heading: "a", body: "x".repeat(50) }] };
const rolled = guardPackAgainstShrink(inbound, outbound, { stage: "test" });
assert.ok(rolled._meta?.shrinkGuardRollback);

const stamped = stampDeliveryGradeMeta(shortPack, { blogLengthTier: "short" });
assert.equal(stamped._meta.deliveryGrade, DELIVERY_GRADE.HUMAN);

console.log("OK: test-delivery-grade");
