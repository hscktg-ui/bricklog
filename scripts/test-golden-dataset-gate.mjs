/**
 * Golden + Haeshin + EQS regression — 90 PASS bar
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { assessGoldenQualityGate, GOLDEN_PASS_SCORE } from "../lib/golden/goldenQualityGate.js";
import { scoreGoldenAiSmell } from "../lib/golden/goldenAiSmellEngine.js";
import { scoreGoldenIndustryFit } from "../lib/golden/goldenIndustryFitEngine.js";
import { getGoldenSamplesForInput } from "../lib/golden/goldenDatasetStore.js";
import { buildGoldenReferencePromptBlock } from "../lib/golden/goldenPromptReference.js";
import { GOLDEN_FAILURE_SAMPLES } from "../lib/golden/goldenFailureSeed.js";
import { assessHaeshinQualityScore } from "../lib/golden/haeshinQualityScorer.js";

const FLOWER_INPUT = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  mainKeyword: "꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "파주 운정 24시간 무인 꽃집", source: "research" },
    { fact: "여름 시즌 리시안셔스·수국·해바라기", source: "research" },
  ],
};

assert.ok(getGoldenSamplesForInput(FLOWER_INPUT, 5).length >= 4, "flower golden samples");
assert.ok(buildGoldenReferencePromptBlock(FLOWER_INPUT).includes("GOLDEN DATASET"));

let pack = buildMissionProseFallbackPack(FLOWER_INPUT);
pack = finalizeContentQualityForDelivery(pack, FLOWER_INPUT, "blog");

const gate = pack._meta?.goldenGate || assessGoldenQualityGate(pack, FLOWER_INPUT);
assert.ok(gate.score >= GOLDEN_PASS_SCORE, `golden score ${gate.score} need ${GOLDEN_PASS_SCORE}+`);
assert.ok(gate.verdict === "pass", `verdict ${gate.verdict}`);
assert.ok(pack._meta?.publishReady === true, "publishReady expected");

const failPack = {
  title: "실패",
  sections: [{ heading: "", body: GOLDEN_FAILURE_SAMPLES[0].content }],
  conclusion: "",
};
const failScore = assessHaeshinQualityScore(failPack, FLOWER_INPUT);
assert.ok(failScore.shouldBlock, `fail should block got ${failScore.score}`);

const aiBad = scoreGoldenAiSmell("이용 볼 때 중립적으로 정리했고 비교가 수월해요 확인해봤어요");
assert.ok(aiBad.score < 80 && aiBad.totalHits >= 3, "AI smell should penalize");

const flowerBad = scoreGoldenIndustryFit("매트리스 프레임 쇼룸 체험", FLOWER_INPUT);
assert.ok(!flowerBad.ok, "furniture leak in flower");

console.log("OK: golden-dataset-gate");
console.log("  score:", gate.score, "verdict:", gate.verdict, "publishReady:", pack._meta?.publishReady);
