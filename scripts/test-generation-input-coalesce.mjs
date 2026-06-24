import assert from "node:assert/strict";
import {
  coalesceBlogGenerationInput,
  mergeWorkspaceBrandIntoInput,
  resolveBlogFormAxes,
} from "@/lib/workspace/brandFormSync.js";
import {
  hasFilledBlogAxes,
  stampVerifiedGenerationAxes,
} from "@/lib/product/deliverySoftPass.js";
import { researchGateBlockedResult } from "@/lib/content/v2PipelineGate.js";

const base = {
  brandName: "테스트카페",
  region: "서울 강남",
  topic: "봄 브런치",
  mainKeyword: "브런치",
};

const merged = coalesceBlogGenerationInput(base, {
  brandName: "",
  region: "",
  topic: "",
  mainKeyword: "브런치",
});
assert.equal(merged.brandName, "테스트카페");
assert.equal(merged.region, "서울 강남");
assert.equal(merged.topic, "봄 브런치");

const fromBrand = mergeWorkspaceBrandIntoInput(
  { brandName: "", region: "" },
  {
    activeBrandId: "b1",
    activeBrand: {
      id: "b1",
      brandName: "모닝브루",
      region: "부산 해운대",
    },
  }
);
assert.equal(fromBrand.brandName, "모닝브루");
assert.equal(fromBrand.region, "부산 해운대");
assert.ok(fromBrand.topic?.includes("모닝브루"));

const sidebarOnly = resolveBlogFormAxes(
  { brandName: "", region: "서울 마포", topic: "봄 메뉴" },
  {
    activeBrandId: "b2",
    activeBrand: { id: "b2", brandName: "달빛베이커리", region: "서울 마포" },
  }
);
assert.equal(sidebarOnly.brandName, "달빛베이커리");
assert.equal(sidebarOnly.region, "서울 마포");

const typedWins = resolveBlogFormAxes(
  { brandName: "폼에적은이름", region: "경기", topic: "오픈" },
  {
    activeBrandId: "b3",
    activeBrand: { id: "b3", brandName: "사이드바이름", region: "서울" },
  }
);
assert.equal(typedWins.brandName, "폼에적은이름");

const stamped = stampVerifiedGenerationAxes({
  brandName: "카페",
  region: "서울",
  topic: "봄 메뉴",
});
assert.equal(hasFilledBlogAxes({ brandName: "", region: "", topic: "" }), false);
assert.equal(hasFilledBlogAxes(stamped), true);

const rescued = researchGateBlockedResult(
  {
    brandName: "테스트카페",
    region: "서울",
    topic: "메뉴 소개",
    mainKeyword: "메뉴",
    v2PipelineEnforced: true,
  },
  { ok: false, reasons: ["human_belief_low"], userMessage: "품질 기준 미달" },
  null
);
assert.ok(
  rescued.blogContent?.sections?.length,
  `research gate should rescue fallback: ${rescued.userMessage}`
);
assert.equal(rescued.ok, true);

console.log("OK: generation input coalesce + research gate rescue");
