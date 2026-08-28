import assert from "node:assert/strict";
import {
  DETAIL_PAGE_CORE_SHOTS,
  DETAIL_PAGE_SHOT_GEN_VERSION,
  generateDetailPageShots,
  listMissingDetailPageShots,
  buildDetailPageShotPrompt,
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

const distinct = await generateDetailPageShots(
  { productName: "여주 햅쌀 10kg" },
  { photos: [{ src: "https://example.com/a.jpg", slot: "hero" }] }
);
assert.equal(distinct.skipped, "no_repeat");
assert.equal(distinct.photos.length, 1);
assert.equal(distinct.photos[0].slot, "hero");
assert.equal(DETAIL_PAGE_SHOT_GEN_VERSION, "detail-shot-gen-v4");
assert.ok(buildDetailPageShotPrompt("hero", { productName: "여주 햅쌀 10kg" }).includes("한국 온라인 쇼핑몰"));
assert.ok(buildDetailPageShotPrompt("observe", { productName: "여주 햅쌀 10kg", industry: "쌀가게" }).includes("쌀알"));
assert.ok(buildDetailPageShotPrompt("scene", { productName: "여주 햅쌀 10kg", industry: "쌀가게" }).includes("밥"));

console.log("ok detail-page-shot-gen missing=hero,observe,feature no_repeat=1");
