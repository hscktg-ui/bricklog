/**
 * 5등 목표 P0 게이트 회귀
 */
import assert from "node:assert/strict";
import { assessGenerationAxisAlignment, suggestAlignedTopics } from "../lib/product/generationAxisAlignGate.js";
import { isCustomerPreviewDeliverablePack } from "../lib/product/contentQualityDelivery.js";
import {
  resolveChannelFirstDeliveryBeliefFloor,
  CHANNEL_FIRST_DELIVERY_BELIEF_OFFSET,
} from "../lib/product/channelQualityStack.js";
import { isCustomerSafeChannelPack } from "../lib/product/brandContentCustomerGate.js";
import { needsGenerationContextBeat } from "../lib/product/generationContextBeat.js";
import { HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";

process.env.BRICLOG_COLUMNIST_SOVEREIGN = "true";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-test-fifth-rank-p0-gates";

const mismatch = assessGenerationAxisAlignment({
  brandName: "여주목마",
  region: "여주",
  topic: "국수나무 돈까스 소개",
  industry: "가구점",
});
assert.equal(mismatch.ok, false);
assert.ok(mismatch.topicSuggestions?.length >= 2, "topic suggestions on mismatch");

const furnitureTopics = suggestAlignedTopics({ industry: "가구점", brandName: "여주목마" });
assert.ok(furnitureTopics.some((t) => /쇼룸|매트리스/.test(t)), "furniture topic suggestions");

const missionPack = {
  sections: [{ heading: "a", body: "b".repeat(200) }],
  _meta: { missionProseFallback: true },
};
const researchInput = {
  researchFacts: [
    { fact: "여주 목마 쇼룸 전시 오픈 — 평일 11시~21시 운영", source: "research" },
    { fact: "매트리스 체험 동선·가족 방문 시설 안내", source: "research" },
    { fact: "주말 예약·주차·시즌 이벤트 운영", source: "research" },
  ],
};
assert.equal(
  isCustomerPreviewDeliverablePack(missionPack, researchInput),
  false,
  "mission fallback blocked when sovereign+research"
);

assert.equal(
  isCustomerSafeChannelPack({ _meta: { generationMode: "form_proxy" } }, "place"),
  false,
  "form_proxy channel pack unsafe"
);

const derivedFloor = resolveChannelFirstDeliveryBeliefFloor(
  "instagram",
  { _meta: { derivedFromVerifiedBlog: true } },
  { humanEditorPass: true }
);
const baseFloor = HUMAN_BELIEF_MIN_SCORE - CHANNEL_FIRST_DELIVERY_BELIEF_OFFSET;
assert.ok(derivedFloor <= baseFloor, "derived blog lowers belief floor");

assert.equal(
  needsGenerationContextBeat({
    brandName: "산책카페",
    region: "전주",
    topic: "한옥마을 카페 데이트",
    industry: "카페",
  }),
  true,
  "thin input needs context beat"
);

console.log("OK test-fifth-rank-p0-gates");
