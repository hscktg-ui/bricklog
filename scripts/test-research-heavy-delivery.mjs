/**
 * 조사·스펙형 주제(스트레스리스 등) — B등급 이상·분량·조사 반영 회귀
 */
import assert from "node:assert/strict";
import { buildForcedMissionProsePack } from "../lib/product/missionProseRouteEngine.js";
import {
  isResearchHeavyTopicInput,
  isInformationalTopicInput,
} from "../lib/content/topicFacetEngine.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { B_GRADE_MIN_SCORE } from "../lib/product/bGradeDeliveryEngine.js";

process.env.BRICLOG_MISSION = "true";

const INPUT = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "STRESSLESS MINT LB D200",
  mainKeyword: "STRESSLESS MINT LB D200",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸",
  blogLengthTier: "medium",
  researchFacts: [
    "스트레스리스 제로지 모드·리클라이닝 각도 조절",
    "프랜차이즈 쇼룸에서 모델별 좌판·등받이 비교",
    "배송·조립·A/S 범위는 계약 시점마다 다름",
  ],
};

assert.ok(isResearchHeavyTopicInput(INPUT), "stressless must be research-heavy");
assert.ok(isInformationalTopicInput(INPUT), "stressless must be informational");

const pack = buildForcedMissionProsePack(INPUT);
const sqv = pack._meta?.sqv || {};
const bodyChars = countBlogBodyCharsWithSpaces(pack);

assert.ok(bodyChars >= 850, `body too short: ${bodyChars}`);
assert.ok((sqv.score ?? 0) >= B_GRADE_MIN_SCORE, `SQV below B: ${sqv.score} grade ${sqv.grade}`);
assert.notEqual(sqv.grade, "C", `grade must not be C (${sqv.grade})`);
assert.ok(pack._meta?.researchHeavyDelivery, "missing researchHeavyDelivery meta");
assert.ok((pack.sections?.length || 0) >= 3, "need 3+ sections for research column");

console.log("OK: research-heavy-delivery", {
  grade: sqv.grade,
  score: sqv.score,
  bodyChars,
  sections: pack.sections?.length,
  deliveryGrade: pack._meta?.deliveryGrade,
  researchHeavyOk: pack._meta?.researchHeavyDeliveryOk,
});
