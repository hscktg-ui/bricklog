/**
 * 블로그 생성 CTA · 송출 신뢰 등급 SSOT
 */
import assert from "node:assert/strict";
import {
  BLOG_GENERATE_CTA,
  blogGenerateCtaRetryFooter,
} from "../lib/product/blogCtaCopy.js";
import { WORKSPACE_BLOG } from "../lib/product/craft.js";
import {
  resolveDeliveryTrustBadge,
  DELIVERY_TRUST_REFERENCE,
  DELIVERY_TRUST_PUBLISH,
} from "../lib/product/deliveryTrustDisplay.js";

assert.equal(WORKSPACE_BLOG.cta, BLOG_GENERATE_CTA);
assert.equal(BLOG_GENERATE_CTA, "조사 후 글 받기");
assert.ok(
  blogGenerateCtaRetryFooter({ isMobile: true }).includes(BLOG_GENERATE_CTA)
);

const rescue = resolveDeliveryTrustBadge({
  sections: [{ title: "t", body: "x".repeat(400) }],
  _meta: { deliveryRescue: true, deliveryPreview: true, softPass: true },
});
assert.equal(rescue.tier, DELIVERY_TRUST_REFERENCE.tier);

const ready = resolveDeliveryTrustBadge({
  sections: [{ title: "t", body: "x".repeat(400) }],
  _meta: { publishReady: true, passOutput: true },
});
assert.equal(ready.tier, DELIVERY_TRUST_PUBLISH.tier);

console.log("OK: blog CTA copy + delivery trust display");
