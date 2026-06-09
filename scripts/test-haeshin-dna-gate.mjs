/**
 * Haeshin DNA + Golden Gate regression
 */
import assert from "node:assert/strict";
import { assessHaeshinQualityScore } from "../lib/golden/haeshinQualityScorer.js";
import { applyGoldenSafeEdit } from "../lib/golden/goldenSafeEditEngine.js";
import { buildHaeshinDnaPromptBlock } from "../lib/golden/haeshinPromptBlocks.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { GOLDEN_FAILURE_SAMPLES } from "../lib/golden/goldenFailureSeed.js";

const FLOWER = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  industry: "꽃집",
  v4Speaker: "brand_intro",
  researchFacts: [{ fact: "파주 운정 24시간 무인 꽃집" }],
};

assert.ok(buildHaeshinDnaPromptBlock(FLOWER).includes("HAESHIN"));
assert.ok(buildHaeshinDnaPromptBlock(FLOWER).includes("꽃"));

let pack = buildMissionProseFallbackPack(FLOWER);
pack = finalizeContentQualityForDelivery(pack, FLOWER, "blog");
const gate = pack._meta?.goldenGate;
assert.ok(gate?.score >= 75, `flower golden ${gate?.score}`);

const failPack = {
  title: "실패",
  sections: [{ heading: "", body: GOLDEN_FAILURE_SAMPLES[0].content }],
  conclusion: "",
};
const failScore = assessHaeshinQualityScore(failPack, FLOWER);
assert.ok(failScore.score < 80, `fail should be <80 got ${failScore.score}`);
assert.ok(failScore.shouldBlock);

const safe = applyGoldenSafeEdit(failPack, FLOWER);
assert.ok(safe._meta?.goldenSafeEdit || safe._meta?.goldenSafeEditSkipped);

console.log("OK: haeshin-dna-gate");
console.log("  flower:", gate?.score, gate?.verdict);
console.log("  fail:", failScore.score);
