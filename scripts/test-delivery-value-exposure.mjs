/**
 * delivery value exposure — dossier-first UI payload
 */
import assert from "node:assert/strict";
import {
  buildDeliveryValueExposure,
  attachDeliveryValueToBlogResult,
} from "../lib/product/deliveryValueExposure.js";

const input = {
  brandName: "애월바다펜션",
  region: "제주",
  topic: "장박 할인",
  industry: "펜션",
  storeFeatures: "오션뷰 · 바비큐 · 장박 20%",
  researchFacts: [
    { text: "비수기 장박 20% 할인", kind: "promo" },
    { text: "오션뷰 객실 8실", kind: "facility" },
    { text: "바비큐장 별도 이용", kind: "service" },
  ],
};

const exposure = buildDeliveryValueExposure(input);
assert.ok(exposure.operatingItems?.length >= 1, "operating items");
assert.ok(exposure.researchLines?.length >= 2, "research lines");
assert.ok(exposure.explainLine?.length >= 8, "explain line");
assert.ok(exposure.checks?.some((c) => c.id === "research" && c.ok), "research check");

const pack = {
  sections: [{ heading: "h", body: "비수기 장박 20% 할인과 오션뷰 객실 안내. ".repeat(20) }],
  _meta: {},
};
const attached = attachDeliveryValueToBlogResult(
  { ok: true, blogContent: pack, meta: {} },
  input,
  null
);
assert.ok(attached.meta.deliveryValue, "meta deliveryValue");
assert.ok(attached.blogContent._meta.deliveryValueExposure, "pack exposure");

console.log("OK delivery-value-exposure");
