/**
 * GPT-5.5 light delivery path — Writer 보존 · 2차 Writer OFF · Mission pad 없음
 */
import assert from "node:assert/strict";
import {
  shouldUseGpt55LightDelivery,
  shouldSkipWriterEngineForGpt55,
  finalizeGpt55BlogPackForUi,
  applyGpt55PostWriteLightPass,
} from "@/lib/product/gpt55LightDelivery.js";
import { needsWriterEnginePass } from "@/lib/product/humanTierRegen.js";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract.js";
import { isWriterEngineExpansionEnabled } from "@/lib/config/briclogFastPipeline.js";
import { isSlimWriterPromptEnabled } from "@/lib/config/briclogFastPipeline.js";
import { buildMissionConclusionLine } from "@/lib/product/missionProseEngine.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;
const prevKey = process.env.OPENAI_API_KEY;
const prevWriter = process.env.BRICLOG_WRITER_ENGINE;
const prevMax = process.env.BRICLOG_MAX_QUALITY;
process.env.BRICLOG_GPT55_DOMINANT = "true";
process.env.OPENAI_API_KEY = "sk-test-key-for-gpt55-light-delivery-0123456789";
process.env.BRICLOG_MAX_QUALITY = "false";
delete process.env.BRICLOG_WRITER_ENGINE;

const input = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스",
  industry: "가구",
  blogLengthTier: "medium",
};

const llmPack = {
  title: "경기도 용인 에이스침대 스트레스리스 체험기",
  sections: [
    {
      heading: "쇼룸에 들어서며",
      body: "스트레스리스 체어를 보러 경기도 용인 에이스침대에 들렀어요. 전시 모델마다 좌판 깊이가 달라서, 식탁 높이에 맞춰 앉아 보는 순서로 비교했어요.",
    },
    {
      heading: "앉아 본 차이",
      body: "등받이 각도와 팔걸이 높이를 바꿔 보니, 오래 앉을 자리와 식사 자리에서 편한 지점이 달랐어요. 직원 안내로 당일 전시 구성을 메모해 두었어요. STRESSLESS MINT LB D200은 좌판 쿠션 밀도가 부드러운 편이라, 테이블 옆에서 앉은 높이를 먼저 맞춰 보는 게 좋았어요. 같은 라인 안에서도 팔걸이 폭과 등받이 기울기 범위가 모델마다 달라, 두세 개를 연속으로 앉아 보며 비교하는 편이 헷갈림이 줄었어요.",
    },
    {
      heading: "정리",
      body: "사진만으로는 감이 안 오던 지지감을 직접 확인할 수 있었어요. 방문 전 예약·주차는 매장 안내를 기준으로 확인하면 됩니다.",
    },
  ],
  conclusion: "체험 후 본인 공간에 맞는 모델을 고르는 편이 좋았어요.",
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

assert.ok(isWriterEngineExpansionEnabled() === false, "writer engine default off for gpt55");
assert.ok(isSlimWriterPromptEnabled(), "slim writer always on for gpt55");
assert.ok(shouldUseGpt55LightDelivery(llmPack, input));
const contract = assessHumanColumnContract(llmPack, input);
if (contract.ok && contract.humanVoiceMet) {
  assert.ok(shouldSkipWriterEngineForGpt55(llmPack, input));
  assert.ok(!needsWriterEnginePass(llmPack, input));
} else {
  assert.ok(!shouldSkipWriterEngineForGpt55(llmPack, input));
  assert.ok(needsWriterEnginePass(llmPack, input));
}

const catalog = buildMissionConclusionLine(
  { regionBit: "경기도 용인 ", brand: "에이스침대", topicFacet: "스트레스리스" },
  input,
  "스트레스리스",
  llmPack
);
assert.equal(catalog, "");

const postWrite = applyGpt55PostWriteLightPass(llmPack, input);
assert.ok(postWrite._meta?.gpt55PostWriteLight);
assert.ok(!/좌판·등받이·팔걸이를\s*함께\s*보면\s*선택이\s*수월/.test(getBlogFullText(postWrite)));

const ui = finalizeGpt55BlogPackForUi(llmPack, input);
assert.ok(ui._meta?.gpt55LightDelivery);
assert.ok(!/프랜차이즈\s*쇼룸\s*안내를\s*기준으로/.test(getBlogFullText(ui)));
assert.ok((ui.sections?.length || 0) >= 3);

if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;
if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;
if (prevWriter === undefined) delete process.env.BRICLOG_WRITER_ENGINE;
else process.env.BRICLOG_WRITER_ENGINE = prevWriter;
if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;

console.log("OK: gpt55 light delivery — writer off, slim prompt, pre-publish + ui finalize");
