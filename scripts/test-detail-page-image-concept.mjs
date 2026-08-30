import assert from "node:assert/strict";
import {
  DETAIL_PAGE_IMAGE_CONCEPT_VERSION,
  DETAIL_PAGE_IMAGE_LAYERS,
  inspectDetailPageImageConcept,
  listDetailPageShotSubjects,
} from "../lib/product/detailPageImageConcept.js";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";

assert.equal(DETAIL_PAGE_IMAGE_CONCEPT_VERSION, "detail-image-concept-v1");
assert.equal(DETAIL_PAGE_IMAGE_LAYERS.productShots.id, "product_shots");
assert.equal(DETAIL_PAGE_IMAGE_LAYERS.mallStack.id, "mall_stack");

const grocery = listDetailPageShotSubjects({
  productName: "여주 햅쌀 10kg",
  industry: "쌀가게",
});
assert.deepEqual(
  grocery.filter((s) => s.required).map((s) => s.id),
  ["pack", "grain", "label"]
);

const cafe = listDetailPageShotSubjects({
  productName: "하우스 블렌드 원두 200g",
  industry: "카페",
});
assert.deepEqual(
  cafe.filter((s) => s.required).map((s) => s.id),
  ["pack", "bean", "label"]
);

const empty = inspectDetailPageImageConcept({
  photos: [],
  input: { productName: "여주 햅쌀 10kg", industry: "쌀가게" },
});
assert.equal(empty.ok, false);
assert.deepEqual(empty.missing, ["pack", "grain", "label"]);

const sameBag = inspectDetailPageImageConcept({
  photos: [
    { src: "/bag.png", slot: "hero" },
    { src: "/bag.png", slot: "observe" },
    { src: "/bag.png", slot: "feature" },
  ],
  input: { productName: "여주 햅쌀 10kg", industry: "쌀가게" },
});
assert.equal(sameBag.ok, false);
assert.equal(sameBag.reusedSrc, true);

const distinct = inspectDetailPageImageConcept({
  photos: [
    { src: "/pack.png", slot: "hero" },
    { src: "/grain.png", slot: "observe" },
    { src: "/label.png", slot: "feature" },
  ],
  input: { productName: "여주 햅쌀 10kg", industry: "쌀가게" },
});
assert.equal(distinct.ok, true);
assert.equal(distinct.requiredFilledCount, 3);
assert.equal(distinct.reusedSrc, false);

const rice = buildDetailPagePublicSample("open-rice");
assert.equal(rice.pack._meta.imageConcept.ok, true, rice.pack._meta.imageConcept.doctrine);
assert.equal(rice.success.imageConcept.ok, true);
assert.equal(rice.success.imageConcept.requiredFilledCount, 3);

console.log(
  `ok detail-page-image-concept empty=${empty.missing.join(",")} reuse=${sameBag.reusedSrc} rice=${rice.success.imageConcept.requiredFilledCount}/3`
);
