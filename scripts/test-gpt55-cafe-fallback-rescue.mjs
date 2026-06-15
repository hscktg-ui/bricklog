/**
 * GPT-5.5 Writer 우선 + 카페 일반 주제 — LLM 실패 시 industry editorial 송출
 */
import assert from "node:assert/strict";
import { buildDeliverableBlogFallback } from "../lib/llm/blogDeliveryFallback.js";
import { buildMissionRescueApiDelivery } from "../lib/generation/missionRescueDelivery.js";
import { alignBlogApiDeliveryResponse } from "../lib/product/blogApiDeliveryGate.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;
const prevMission = process.env.BRICLOG_MISSION;
const prevReset = process.env.BRICLOG_RESET_QUALITY;

process.env.BRICLOG_GPT55_DOMINANT = "true";
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const CAFE = {
  brandName: "실측모닝브루",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
  storeFeatures: "수제 브런치",
  blogLengthTier: "short",
  writingSkillLevel: "civilian",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  researchEnabled: true,
  researchMode: "v2_axis",
};

try {
  const { pack, source } = buildDeliverableBlogFallback({
    input: CAFE,
    failures: ["llm_failed"],
  });
  assert.ok(pack?.sections?.length >= 2, `fallback sections: ${source}`);
  assert.ok(
    countBlogBodyCharsWithSpaces(pack) >= 400,
    "fallback char count"
  );

  const rescued = buildMissionRescueApiDelivery(
    CAFE,
    { reasons: ["empty_pack"] },
    { mode: "mission_rescue_delivery" }
  );
  assert.ok(rescued?.blogContent?.sections?.length >= 2);
  assert.equal(rescued.mode, "mission_rescue_delivery");

  const aligned = alignBlogApiDeliveryResponse(rescued, CAFE);
  assert.equal(aligned.ok, true);
  assert.equal(aligned.withheld, false);

  console.log("test-gpt55-cafe-fallback-rescue: PASS");
} finally {
  if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
  else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;
  if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
  else process.env.BRICLOG_MISSION = prevMission;
  if (prevReset === undefined) delete process.env.BRICLOG_RESET_QUALITY;
  else process.env.BRICLOG_RESET_QUALITY = prevReset;
}
