import assert from "node:assert/strict";
import {
  DETAIL_PAGE_CORE_SHOTS,
  generateDetailPageShots,
  listMissingDetailPageShots,
} from "../lib/product/detailPageShotGen.js";

assert.deepEqual([...DETAIL_PAGE_CORE_SHOTS], ["hero", "observe", "feature"]);
assert.deepEqual(listMissingDetailPageShots([]), ["hero", "observe", "feature"]);
assert.deepEqual(
  listMissingDetailPageShots([{ src: "x", slot: "hero" }]),
  ["observe", "feature"]
);
assert.deepEqual(
  listMissingDetailPageShots([
    { src: "a", slot: "hero" },
    { src: "b", slot: "observe" },
    { src: "c", slot: "feature" },
  ]),
  []
);
assert.deepEqual(listMissingDetailPageShots([{ src: "a" }, { src: "b" }]), [
  "feature",
]);

const skipped = await generateDetailPageShots(
  { productName: "여주 햅쌀 10kg" },
  { allowImages: false, photos: [] }
);
assert.equal(skipped.skipped, "disabled");
assert.equal(skipped.photos.length, 0);

const kept = await generateDetailPageShots(
  { productName: "여주 햅쌀 10kg" },
  {
    allowImages: false,
    photos: [{ src: "https://example.com/a.jpg", slot: "hero" }],
  }
);
assert.equal(kept.photos[0].slot, "hero");
assert.equal(kept.generated.length, 0);

const cloned = await generateDetailPageShots(
  { productName: "여주 햅쌀 10kg" },
  { photos: [{ src: "https://example.com/a.jpg", slot: "hero" }] }
);
assert.equal(cloned.skipped, "same_sku");
assert.equal(cloned.photos.length, 3);
assert.ok(cloned.photos.every((p) => p.src === "https://example.com/a.jpg"));

console.log("ok detail-page-shot-gen missing=hero,observe,feature same_sku=3");
