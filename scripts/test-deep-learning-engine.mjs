/**
 * BRICLOG Deep Learning Engine — 사고 단계 · 장면 · 스코어
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext.js";
import {
  applyDeepLearningPack,
  buildClueInferenceBrief,
  countFieldScenesInText,
  DEEP_LEARNING_MIN_FIELD_SCENES,
  DEEP_LEARNING_MIN_SCORE,
  inferCustomerSituations,
  isDeepLearningForbidden,
  isVariableSubstitutionFailure,
  scoreDeepLearning,
} from "@/lib/product/deepLearningEngine.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";

assert.ok(isDeepLearningForbidden("이 주제 후보에 올려두고 직접 알아봤어요."));
assert.ok(isDeepLearningForbidden("공식 안내 기준으로 확인하는 것이 좋습니다."));
assert.ok(isVariableSubstitutionFailure("파주 그래서 에이스침대"));
assert.ok(isVariableSubstitutionFailure("이 매장는 무첨가 원료로"));

const furnitureInput = {
  topic: "오피모 전시",
  mainKeyword: "오피모 전시",
  brandName: "에이스침대",
  region: "파주",
  industry: "furniture",
  blogLengthTier: "medium",
  researchFacts: ["오피모 전시 구성", "쇼룸 체험"],
};

const petInput = {
  topic: "수제간식업체 소개",
  mainKeyword: "수제간식업체 소개",
  brandName: "더건강하개",
  region: "용인",
  industry: "pet",
  blogLengthTier: "medium",
};

const preWrite = prepareBriclogPreWriteContext(furnitureInput);
assert.ok(preWrite.deepLearningBrief?.includes("고객 상황"));
assert.ok(preWrite.customerSituations?.situations?.length >= 2);

const furnitureSituations = inferCustomerSituations(furnitureInput);
assert.ok(furnitureSituations.situations.some((s) => /침실|프레임|전시/.test(s)));

const petSituations = inferCustomerSituations(petInput);
assert.ok(petSituations.situations.some((s) => /간식|원재료|알레르기/.test(s)));

const clues = buildClueInferenceBrief(furnitureInput);
assert.ok(clues.length >= 5);
assert.ok(clues.some((q) => /에이스침대/.test(q)));

const pack = buildMissionProseFallbackPack(furnitureInput);
const deep = applyDeepLearningPack(pack, furnitureInput);
const finished = applyHumanityFinishPass(deep, { input: furnitureInput }, "blog");
const full = getBlogFullText(finished);
const score = scoreDeepLearning(finished, furnitureInput);

assert.ok(countFieldScenesInText(full) >= DEEP_LEARNING_MIN_FIELD_SCENES, "field scenes", {
  count: countFieldScenesInText(full),
});
assert.equal(score.dimensions.fieldScenes, countFieldScenesInText(full));
assert.ok(!/후보에\s*올려/.test(full), "no candidate pad");
assert.ok(!/이\s*매장는/.test(full), "no josa fail");
assert.ok(score.total >= DEEP_LEARNING_MIN_SCORE - 5, "score near pass", score);

console.log("OK: deep learning engine");
console.log("  score:", score.total, "scenes:", score.dimensions.fieldScenes);
console.log("  dimensions:", score.dimensions);
