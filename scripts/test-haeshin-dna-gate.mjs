/**
 * Haeshin DNA + Golden Gate regression — 90 PASS
 */
import assert from "node:assert/strict";
import { assessHaeshinQualityScore } from "../lib/golden/haeshinQualityScorer.js";
import { applyGoldenSafeEdit } from "../lib/golden/goldenSafeEditEngine.js";
import { buildHaeshinDnaPromptBlock } from "../lib/golden/haeshinPromptBlocks.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { GOLDEN_FAILURE_SAMPLES } from "../lib/golden/goldenFailureSeed.js";
import { detectFailureArticlePatterns } from "../lib/golden/goldenFailureDetection.js";
import { GOLDEN_PASS_SCORE } from "../lib/golden/goldenQualityGate.js";

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
assert.ok(gate?.score >= GOLDEN_PASS_SCORE, `flower golden ${gate?.score}`);
assert.ok(gate?.verdict === "pass");

const failPack = {
  title: "실패",
  sections: [{ heading: "", body: GOLDEN_FAILURE_SAMPLES[0].content }],
  conclusion: "",
};
const failScore = assessHaeshinQualityScore(failPack, FLOWER);
assert.ok(failScore.shouldBlock);
assert.ok(detectFailureArticlePatterns(GOLDEN_FAILURE_SAMPLES[0].content, FLOWER).criticalFail);

const voiceMix = applyGoldenSafeEdit(
  {
    title: "t",
    sections: [
      {
        heading: "",
        body: "6월이 시작됩니다. 여름에는 리시안셔스와 수국이 어울립니다. 현장에서 리시안셔스 이야기를 들으며 메모해 뒀어요. 색감을 먼저 보게 됩니다.",
      },
    ],
    conclusion: "참고해보세요.",
  },
  FLOWER
);
const voiceBody = String(voiceMix.sections?.[0]?.body || "");
assert.ok(
  !voiceBody.includes("메모해") && !voiceBody.includes("뒀어요"),
  `voice mix should normalize or rewrite got: ${voiceBody}`
);

console.log("OK: haeshin-dna-gate");
console.log("  flower:", gate?.score, gate?.verdict);
console.log("  fail:", failScore.score);
