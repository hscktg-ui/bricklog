/**
 * Golden Dataset Gate regression
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { assessGoldenQualityGate, GOLDEN_PASS_SCORE } from "../lib/golden/goldenQualityGate.js";
import { scoreGoldenAiSmell } from "../lib/golden/goldenAiSmellEngine.js";
import { scoreGoldenIndustryFit } from "../lib/golden/goldenIndustryFitEngine.js";
import { getGoldenSamplesForInput } from "../lib/golden/goldenDatasetStore.js";
import { buildGoldenReferencePromptBlock } from "../lib/golden/goldenPromptReference.js";

const FLOWER_INPUT = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  mainKeyword: "꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [{ fact: "파주 운정 24시간 무인 꽃집", source: "research" }],
};

assert.ok(getGoldenSamplesForInput(FLOWER_INPUT, 5).length >= 1, "flower golden samples");
assert.ok(buildGoldenReferencePromptBlock(FLOWER_INPUT).includes("GOLDEN DATASET"));

let pack = buildMissionProseFallbackPack(FLOWER_INPUT);
pack = finalizeContentQualityForDelivery(pack, FLOWER_INPUT, "blog");

const gate = pack._meta?.goldenGate || assessGoldenQualityGate(pack, FLOWER_INPUT);
assert.ok(gate.score >= 80, `golden score ${gate.score} (v2-haeshin: 80+ revise, 90+ pass)`);
assert.ok(gate.verdict === "pass" || gate.verdict === "revise", `verdict ${gate.verdict}`);
assert.ok(gate.haeshin?.score >= 70, `haeshin core ${gate.haeshin?.score}`);

const aiBad = scoreGoldenAiSmell("이용 볼 때 중립적으로 정리했고 비교가 수월해요 확인해봤어요");
assert.ok(aiBad.score < 80 && aiBad.totalHits >= 3, "AI smell should penalize");

const flowerBad = scoreGoldenIndustryFit("매트리스 프레임 쇼룸 체험", FLOWER_INPUT);
assert.ok(!flowerBad.ok, "furniture leak in flower");

console.log("OK: golden-dataset-gate");
console.log("  score:", gate.score, "verdict:", gate.verdict, "pass:", GOLDEN_PASS_SCORE);
