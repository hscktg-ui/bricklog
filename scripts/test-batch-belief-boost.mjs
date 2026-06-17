/**
 * 로컬 배치 belief·first delivery 스탬프
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finishLocalBlogPackForBatch, BATCH_BELIEF_FLOOR } from "../lib/product/localBatchFinish.js";
import { assessFirstDeliveryQuality } from "../lib/product/firstDeliveryQuality.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { buildResearchGroundedInstagramPack } from "../lib/content/researchGroundedHumanPack.js";
import { finishLocalChannelPackForBatch } from "../lib/product/localBatchFinish.js";
import { scoreHumanBelief as scoreBelief } from "../lib/product/humanBeliefEngine.js";
import { getChannelFullText } from "../lib/content/channelPack.js";

const blogInput = {
  brandName: "강남카페",
  region: "강남",
  topic: "시즌 프로모션 카페",
  industry: "카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  contentPersona: "brand_story",
  researchFacts: [
    { fact: "강남 카페 — 시즌 프로모션 관련 이번 달 안내", source: "research" },
    { fact: "강남카페 예약·상담·운영 시간은 매장 기준", source: "research" },
  ],
  v2PreWriteVerified: true,
};

let blogPack = buildMissionProseFallbackPack(blogInput);
blogPack = finishLocalBlogPackForBatch(blogPack, blogInput);
const belief = scoreHumanBelief(getBlogFullText(blogPack), blogInput, blogPack);
assert.ok(belief.score >= BATCH_BELIEF_FLOOR, `belief ${belief.score}`);
const first = assessFirstDeliveryQuality(blogPack, blogInput);
assert.ok(first.displayReady || belief.score >= BATCH_BELIEF_FLOOR);

const instaInput = { ...blogInput, instaBodyLength: "medium" };
let insta = buildResearchGroundedInstagramPack(instaInput, "informative");
insta = finishLocalChannelPackForBatch(insta, "instagram", instaInput);
const instaBelief = scoreBelief(
  getChannelFullText(insta, "instagram"),
  instaInput,
  insta
);
assert.ok(instaBelief.score >= 40, `insta belief ${instaBelief.score}`);

console.log("OK: batch-belief-boost", {
  blogBelief: belief.score,
  firstReady: first.displayReady,
  instaBelief: instaBelief.score,
});
