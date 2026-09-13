import assert from "node:assert/strict";
import {
  DETAIL_PAGE_SPEC_SLOTS,
  applyVendorMethodToPack,
  assignVendorPhotoSlots,
  classifyVendorPhotoRole,
  firstGlanceHeadline,
} from "../lib/product/detailPageVendorMethod.js";
import { getDetailPageExample } from "../lib/product/detailPageCompanyPresets.js";

assert.equal(DETAIL_PAGE_SPEC_SLOTS.length, 6);
assert.equal(classifyVendorPhotoRole({ src: "/x/open-rice-canvas-macro.png" }), "detail");
assert.equal(classifyVendorPhotoRole({ src: "/x/open-rice-canvas-meal.png" }), "usage");
assert.equal(classifyVendorPhotoRole({ name: "front-pack.jpg", slot: "" }, 0), "packshot");

const slotted = assignVendorPhotoSlots([
  { src: "/a-macro.png" },
  { src: "/b-hero.png" },
]);
assert.equal(slotted[0].role, "detail");
assert.equal(slotted[0].slot, "observe");
assert.equal(slotted[1].role, "packshot");
assert.equal(slotted[1].slot, "hero");

const rice = getDetailPageExample("open-rice");
const beans = getDetailPageExample("open-beans");
const riceGlance = firstGlanceHeadline(rice);
const beansGlance = firstGlanceHeadline(beans);
assert.match(riceGlance, /햅쌀/);
assert.match(riceGlance, /10kg|진상/);
assert.equal(/온기|밥맛/.test(riceGlance), false);
assert.match(beansGlance, /200g|중배전/);
assert.equal(/향은|내려야/.test(beansGlance), false);

const applied = applyVendorMethodToPack(
  {
    productName: rice.productName,
    sections: [{ type: "hero", title: "갓 지은 밥 한 공기의 온기", kicker: "여주" }],
  },
  rice
);
assert.equal(applied.sections[0].title, riceGlance);
assert.ok(applied._meta.vendorMethod.glance);

console.log(`ok vendor-method rice="${riceGlance}" beans="${beansGlance}"`);
