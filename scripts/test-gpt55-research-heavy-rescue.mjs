/**
 * GPT-5.5 Writer 우선 + 조사·스펙형 주제 — mission prose research-heavy 송출 회귀
 */
import assert from "node:assert/strict";
import {
  isResearchHeavyTopicInput,
  isSpecDenseLowPublicInfoTopic,
} from "../lib/content/topicFacetEngine.js";
import {
  shouldResearchHeavyMissionRescue,
  shouldForceMissionProseOnlyPath,
} from "../lib/product/missionProseRouteFlags.js";
import { tryDeliverResearchHeavyMissionRescue } from "../lib/product/missionProseRouteEngine.js";
import { alignBlogApiDeliveryResponse } from "../lib/product/blogApiDeliveryGate.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { B_GRADE_MIN_SCORE } from "../lib/product/bGradeDeliveryEngine.js";

const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;
const prevMission = process.env.BRICLOG_MISSION;
const prevReset = process.env.BRICLOG_RESET_QUALITY;
const prevKey = process.env.OPENAI_API_KEY;

process.env.BRICLOG_GPT55_DOMINANT = "true";
process.env.OPENAI_API_KEY = "sk-test-key-for-gpt55-research-heavy-rescue";
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const STRESSLESS = {
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
  ],
};

const LUCHE = {
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시 소식",
  mainKeyword: "루체3 전시",
  industry: "가구",
  storeFeatures: "쇼룸 전시",
  blogLengthTier: "medium",
};

assert.ok(isResearchHeavyTopicInput(STRESSLESS), "stressless research-heavy");
assert.ok(isResearchHeavyTopicInput(LUCHE), "luche3 showroom research-heavy");
assert.ok(isSpecDenseLowPublicInfoTopic(LUCHE), "luche3 spec-dense");
assert.ok(!shouldForceMissionProseOnlyPath(STRESSLESS), "gpt55 blocks forced chair path");
assert.ok(shouldResearchHeavyMissionRescue(STRESSLESS), "research-heavy rescue allowed");

const delivered = tryDeliverResearchHeavyMissionRescue(STRESSLESS);
assert.ok(delivered?.ok, "rescue must return ok");
assert.ok(delivered?.blogContent?.sections?.length, "rescue must have sections");
assert.equal(delivered.mode, "research_heavy_rescue");

const aligned = alignBlogApiDeliveryResponse(delivered, STRESSLESS);
assert.equal(aligned.withheld, false, "api gate must not withhold research-heavy rescue");
assert.equal(aligned.ok, true);

const bodyChars = countBlogBodyCharsWithSpaces(aligned.blogContent);
const sqv = aligned.blogContent._meta?.sqv || {};
assert.ok(bodyChars >= 850, `body too short: ${bodyChars}`);
assert.ok((sqv.score ?? 0) >= B_GRADE_MIN_SCORE, `SQV below B: ${sqv.score}`);

if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;
if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevReset === undefined) delete process.env.BRICLOG_RESET_QUALITY;
else process.env.BRICLOG_RESET_QUALITY = prevReset;
if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;

console.log("OK: gpt55-research-heavy-rescue", {
  mode: aligned.mode,
  grade: sqv.grade,
  score: sqv.score,
  bodyChars,
  sections: aligned.blogContent.sections.length,
});
