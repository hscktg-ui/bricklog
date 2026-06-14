/**
 * #1 버그 회귀 — 모든 채널 finish 경로에 글값(SQV) 필수
 */
import assert from "node:assert/strict";
import {
  finishChannelPack,
  finishChannelPackForDelivery,
  finishChannelPackForBatch,
  assertChannelContentQualityValueStamped,
} from "../lib/product/channelQualityStack.js";
import { applyAGradeChannelPass } from "../lib/product/aGradeDeliveryEngine.js";
import { finishLocalChannelPackForBatch } from "../lib/product/localBatchFinish.js";
import { runPlacePipeline, runInstagramPipeline } from "../lib/contentPipeline.js";
import { resolvePublishReadiness } from "../lib/product/publishUiDisplay.js";
import {
  buildResearchGroundedPlacePack,
  buildResearchGroundedInstagramPack,
} from "../lib/content/researchGroundedHumanPack.js";

const prevMission = process.env.BRICLOG_MISSION;
process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "꽃담",
  region: "부산 해운대",
  topic: "어버이날 꽃다발",
  industry: "꽃집",
  v4Speaker: "brand_intro",
  instaBodyLength: "medium",
};

const blog = {
  title: "어버이날, 말 대신 꽃으로 전하는 마음",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "어버이날을 앞두고 부모님께 드릴 꽃을 고르다가 해운대 꽃담을 알게 됐어요. 직접 들러 보니 진열이 차분했고 솔직히 인상이 좋았습니다.",
    },
    {
      heading: "매장에서 본 것",
      body: "다발 구성과 리본 색을 같이 맞춰 주셨고, 픽업 시간도 당일 안내로 확인했어요.",
    },
    {
      heading: "인상",
      body: "화려한 포장보다 오래 두고 봐도 편한 조합을 우선한다는 점이 인상적이었어요.",
    },
  ],
  conclusion: "일정만 정리해 두면 상담이 빨라집니다.",
};

function expectSq(pack, channel, label) {
  const sqv = assertChannelContentQualityValueStamped(pack, channel, label);
  assert.ok(sqv.score >= 0, `${label} score`);
  assert.ok(["A", "B", "C", "D", "F"].includes(sqv.grade), `${label} grade`);
  const readiness = resolvePublishReadiness(pack);
  assert.equal(typeof readiness.sqvScore, "number", `${label} readiness sqvScore`);
  return sqv;
}

const pipelinePlace = runPlacePipeline(input, blog, "테스트");
expectSq(pipelinePlace, "place", "contentPipeline.place");

const pipelineInsta = runInstagramPipeline(input, blog, "emotional", "테스트");
expectSq(pipelineInsta, "instagram", "contentPipeline.instagram");

const delivered = finishChannelPackForDelivery("place", pipelinePlace, { input });
expectSq(delivered, "place", "finishChannelPackForDelivery");

const batched = finishChannelPackForBatch("instagram", pipelineInsta, { input });
expectSq(batched, "instagram", "finishChannelPackForBatch");

const fullFinished = finishChannelPack("place", pipelinePlace, { input, sourceChannel: "blog" });
expectSq(fullFinished, "place", "finishChannelPack");

let groundedPlace = buildResearchGroundedPlacePack(input);
groundedPlace = finishLocalChannelPackForBatch(groundedPlace, "place", input);
expectSq(groundedPlace, "place", "localBatchFinish.place");

let groundedInsta = buildResearchGroundedInstagramPack(input, "informative");
groundedInsta = finishLocalChannelPackForBatch(groundedInsta, "instagram", input);
expectSq(groundedInsta, "instagram", "localBatchFinish.instagram");

const prevFloor = process.env.BRICLOG_A_GRADE_FLOOR;
process.env.BRICLOG_A_GRADE_FLOOR = "false";
const noFloor = applyAGradeChannelPass(pipelinePlace, "place", input);
expectSq(noFloor, "place", "aGradeFloorOff.place");
if (prevFloor === undefined) delete process.env.BRICLOG_A_GRADE_FLOOR;
else process.env.BRICLOG_A_GRADE_FLOOR = prevFloor;

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;

console.log("OK: channel SQV delivery — all finish paths stamp 글값");
