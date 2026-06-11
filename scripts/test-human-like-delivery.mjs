/**
 * Human-Like Delivery SSOT — GPT55 light 우회 · Writer 트리거 · 풀 에디터 패스
 */
import assert from "node:assert/strict";
import {
  assessHumanLikeDelivery,
  applyHumanLikeDeliveryPass,
  needsHumanLikePass,
  isHumanLikeDeliveryEnabled,
} from "@/lib/product/humanLikeDeliveryEngine.js";
import {
  shouldSkipWriterEngineForGpt55,
} from "@/lib/product/gpt55LightDelivery.js";
import { needsWriterEnginePass } from "@/lib/product/humanTierRegen.js";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract.js";

const prevMission = process.env.BRICLOG_MISSION_ENFORCED;
process.env.BRICLOG_MISSION_ENFORCED = "true";

const input = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스",
  industry: "가구",
  blogLengthTier: "medium",
};

const roboticPack = {
  title: "스트레스리스 안내",
  sections: [
    {
      heading: "개요",
      body: "많은 분들이 스트레스리스에 관심을 가지고 있습니다. 종합적으로 보면 편안한 좌석입니다. 도움이 되시길 바랍니다.",
    },
    {
      heading: "특징",
      body: "다양한 기능을 제공합니다. 확인하세요. 참고하시기 바랍니다.",
    },
    {
      heading: "정리",
      body: "이상으로 정리해 보았습니다. 궁금한 점은 문의하세요.",
    },
  ],
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

const humanishPack = {
  title: "경기도 용인 에이스침대 스트레스리스 체험기",
  sections: [
    {
      heading: "쇼룸에 들어서며",
      body: "스트레스리스 체어를 보러 경기도 용인 에이스침대에 들렀어요. 전시 모델마다 좌판 깊이가 달라서, 식탁 높이에 맞춰 앉아 보는 순서로 비교했어요. 처음에는 사진만 보고 고르려다가, 직접 앉아 보니 등받이 각도 차이가 체감됐어요.",
    },
    {
      heading: "앉아 본 차이",
      body: "등받이 각도와 팔걸이 높이를 바꿔 보니, 오래 앉을 자리와 식사 자리에서 편한 지점이 달랐어요. 직원 안내로 당일 전시 구성을 메모해 두었어요. STRESSLESS MINT LB D200은 좌판 쿠션 밀도가 부드러운 편이라, 테이블 옆에서 앉은 높이를 먼저 맞춰 보는 게 좋았어요.",
    },
    {
      heading: "정리",
      body: "사진만으로는 감이 안 오던 지지감을 직접 확인할 수 있었어요. 방문 전 예약·주차는 매장 안내를 기준으로 확인하면 됩니다.",
    },
  ],
  conclusion: "체험 후 본인 공간에 맞는 모델을 고르는 편이 좋았어요.",
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

assert.ok(isHumanLikeDeliveryEnabled());

const roboticAssessed = assessHumanLikeDelivery(roboticPack, input);
assert.equal(roboticAssessed.humanVoiceMet, false, "robotic pack should fail human voice");
assert.ok(needsHumanLikePass(roboticPack, input));
assert.ok(needsWriterEnginePass(roboticPack, input));

const polished = applyHumanLikeDeliveryPass(roboticPack, input);
assert.ok(polished._meta?.humanLikeDeliveryPass);
assert.ok(!/많은 분들이|종합적으로 보면|도움이 되시길/.test(
  polished.sections.map((s) => s.body).join("\n")
));

const humanContract = assessHumanColumnContract(humanishPack, input);
const skipWriter = shouldSkipWriterEngineForGpt55(humanishPack, input);
if (humanContract.ok && humanContract.humanVoiceMet) {
  assert.ok(skipWriter, "human-ready gpt55 pack may skip writer");
} else {
  assert.ok(!skipWriter || needsWriterEnginePass(humanishPack, input), "borderline pack keeps writer option");
}

if (prevMission === undefined) delete process.env.BRICLOG_MISSION_ENFORCED;
else process.env.BRICLOG_MISSION_ENFORCED = prevMission;

console.log("OK: human-like-delivery", {
  roboticBefore: roboticAssessed.reasons.slice(0, 4),
  polishedMeta: polished._meta?.humanLikeAfter,
});
