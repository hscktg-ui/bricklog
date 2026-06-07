import assert from "node:assert/strict";
import {
  coalesceBlogGenerationInput,
  mergeWorkspaceBrandIntoInput,
} from "@/lib/workspace/brandFormSync.js";
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
