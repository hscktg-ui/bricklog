/**
 * Quality Leap + North Star SSOT
 */
import assert from "node:assert/strict";
import { BRICLOG_NORTH_STAR, summarizeNorthStarForAgent } from "../lib/product/qualityNorthStar.js";
import { applyQualityLeapStamp } from "../lib/product/qualityLeapFinish.js";
import { shouldAttemptSovereignAlwaysDeliver } from "../lib/product/sovereignAlwaysDeliver.js";
import { isUnifiedBlogDeliveryPass } from "../lib/product/unifiedDeliveryGate.js";

assert.equal(BRICLOG_NORTH_STAR.humanWritten.minBeliefScore, 85);
assert.ok(BRICLOG_NORTH_STAR.customerSlaMs <= 120_000);
assert.ok(summarizeNorthStarForAgent().includes("north-star-v1"));

const input = {
  brandName: "산책카페",
  region: "전주",
  topic: "봄 브런치",
  industry: "카페",
  storeFeatures: "루프탑 · 베이글 · 반려견",
  researchFacts: [
    { fact: "전주 한옥마을 인근 루프탑 테라스 운영" },
    { fact: "수제 베이글과 시즌 브런치 메뉴" },
  ],
};

const pack = applyQualityLeapStamp(
  {
    title: "전주 산책카페 봄 브런치",
    sections: [
      {
        heading: "한옥마을 산책 후",
        body: "전주 한옥마을 근처에서 루프탑 테라스가 열려 있어 봄 오후에 잠깐 쉬기 좋았어요. 수제 베이글은 겉이 바삭하고 속이 촉촉해서 브런치로 무난했습니다.",
      },
      {
        heading: "베이글과 브런치",
        body: "시즌 브런치는 가벼운 샐러드와 함께 나와 부담 없이 즐길 수 있었어요. 반려견 동반석도 마련돼 있어 산책 코스와 잘 맞습니다.",
      },
      {
        heading: "정리",
        body: "한옥마을 산책 뒤 루프탑에서 베이글 한 판 — 봄 주말에 다시 가고 싶은 조합이었습니다.",
      },
    ],
    _meta: { visitReviewBenchmark: { publishOk: true, score: 90, grade: "A", hardFails: [] } },
  },
  input
);

assert.ok(typeof pack._meta?.humanBeliefScore === "number", "belief stamped");
assert.ok(pack._meta.humanBeliefScore >= 10, "belief score present");
assert.ok(typeof pack._meta?.contentQualityValue === "number", "sqv stamped");
assert.ok(isUnifiedBlogDeliveryPass(pack, input), "unified pass after leap stamp");

process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";
assert.equal(shouldAttemptSovereignAlwaysDeliver(input, { code: "finish_reject" }), true);
assert.equal(shouldAttemptSovereignAlwaysDeliver(input, { code: "openai_quota" }), false);

console.log("OK quality-leap-finish");
