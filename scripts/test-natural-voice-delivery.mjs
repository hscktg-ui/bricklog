/**
 * Natural voice delivery — 정보량·tier 패딩보다 15분 직접 작성 체감 우선
 */
import assert from "node:assert/strict";
import {
  shouldPreferNaturalnessOverDensity,
  resolveNaturalVoiceDeliveryMinChars,
} from "@/lib/product/naturalVoiceDelivery.js";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract.js";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine.js";
import { applyEditorWriterLengthPass } from "@/lib/product/editorWriterDeliveryPass.js";
import { resolveBlogLengthTier } from "@/lib/constants.js";

process.env.BRICLOG_MISSION_ENFORCED = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const input = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스",
  industry: "가구",
  blogLengthTier: "medium",
};

const naturalPack = {
  title: "경기도 용인 에이스침대 스트레스리스 체험기",
  sections: [
    {
      heading: "쇼룸에 들어서며",
      body: "스트레스리스 체어를 보러 경기도 용인 에이스침대에 들렀어요. 전시 모델마다 좌판 깊이가 달라서, 식탁 높이에 맞춰 앉아 보는 순서로 비교했어요. 처음에는 사진만 보고 고르려다가, 직접 앉아 보니 등받이 각도 차이가 체감됐어요. STRESSLESS MINT LB D200은 좌판 쿠션 밀도가 부드러운 편이라 테이블 옆에서 앉은 높이를 먼저 맞춰 보는 게 좋았어요.",
    },
    {
      heading: "앉아 본 차이",
      body: "등받이 각도와 팔걸이 높이를 바꿔 보니, 오래 앉을 자리와 식사 자리에서 편한 지점이 달랐어요. 직원 안내로 당일 전시 구성을 메모해 두었어요. 솔직히 사진만으로는 감이 안 오던 지지감을 직접 확인할 수 있었어요. 방문 전 예약·주차는 매장 안내를 기준으로 확인하면 됩니다.",
    },
    {
      heading: "정리",
      body: "체험 후 본인 공간에 맞는 모델을 고르는 편이 좋았어요. 왜 직접 앉아 보는 순서가 중요한지 이유가 분명해졌어요.",
    },
  ],
  conclusion: "사진보다 현장 체험이 먼저였어요.",
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

const tier = resolveBlogLengthTier("medium");
const naturalMin = resolveNaturalVoiceDeliveryMinChars("medium", tier);
assert.equal(naturalMin, 780, "natural min should match 15-min write floor");
assert.ok(naturalMin < tier.min, "natural min below encyclopedic tier.min");

assert.ok(
  shouldPreferNaturalnessOverDensity(naturalPack, input),
  "GPT55 + belief should prefer naturalness"
);

const contract = assessHumanColumnContract(naturalPack, input);
assert.equal(contract.naturalVoiceFirst, true);
assert.ok(contract.tierMin <= 820, "contract uses natural floor not 5600");
assert.ok(
  shouldSuppressLengthTopoff(naturalPack, input),
  "length topoff suppressed for natural voice pack"
);

const padded = applyEditorWriterLengthPass(
  {
    ...naturalPack,
    _meta: { ...(naturalPack._meta || {}), editorWriterLengthPass: false },
  },
  input
);
assert.ok(
  !padded._meta?.editorWriterLengthMet ||
    padded._meta?.editorWriterLengthDupOk !== false,
  "natural voice pack should not run heavy density refill"
);

console.log("OK: natural voice delivery", {
  naturalMin,
  tierMin: tier.min,
  contractTierMin: contract.tierMin,
  humanVoiceMet: contract.humanVoiceMet,
  beliefScore: contract.beliefScore,
});
