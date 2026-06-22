/**
 * Writer Sovereign — LLM 원고 trim-only · read-aloud gate
 */
import {
  isWriterSovereignModeEnabled,
  applyWriterSovereignDeliveryPass,
  buildWriterSovereignPromptBlock,
} from "../lib/product/writerSovereignPipeline.js";
import { assessReadAloudHumanGate } from "../lib/quality/readAloudHumanGate.js";

process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";
process.env.BRICLOG_MISSION = "true";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

assert("sovereign mode on", isWriterSovereignModeEnabled());

const spamPack = {
  title: "분당 카레클린트 301 체어 전시",
  sections: [
    {
      heading: "쇼룸에서 본 첫인상",
      body: "분당 쇼룸에 들어서자 301 체어 라인이 한쪽 벽면을 따라 이어졌어요. 사진으로 보던 월넛 톤보다 현장 조명 아래에서 색이 조금 더 따뜻하게 느껴졌습니다. 직접 앉아 보니 쿠션 높이와 등받이 각도 차이가 생각보다 컸고, 거실용과 식탁 옆 배치를 염두에 두면 고르는 순서가 달라집니다. 안내해 주신 직원분 말로는 전시 구성이 시즌마다 바뀌어 당일 확인이 중요하다고 했어요.",
    },
    {
      heading: "두 모델을 나란히",
      body: "월넛 프레임과 오크 프레임을 나란히 두고 등받이 각도를 비교했어요. 오크는 밝은 바닥과 잘 맞고, 월넛은 조명 아래에서 분위기가 더 무겁게 잡힙니다. 브랜드 안내에 없는 할인은 글에 적지 않았고, 전시된 쿠션 원단과 프레임 마감만 기준으로 정리했습니다. 501 사이드체어와 함께 배치해 본 사진도 받아 두면 집에서 다시 비교하기 편했어요.",
    },
    {
      heading: "방문 전 체크",
      body: "이사 전에 한 번 더 앉아 보면 후회가 줄어요. 방문 전 주차와 전시 일정만 확인해 두면 당일 동선이 편했고, 피크 시간대를 피하면 체어를 충분히 비교할 수 있었습니다. 관심 모델명을 메모해 가면 상담이 빨라지고, 배송·설치 조건도 같은 자리에서 확인할 수 있어요.",
    },
  ],
  _meta: { gpt55LlmPack: true, llmOriginated: true },
};

const input = {
  brandName: "카레클린트",
  region: "분당",
  topic: "301 체어 전시",
  industry: "furniture",
};

const gate = assessReadAloudHumanGate(spamPack, input);
assert("good sample passes read-aloud", gate.ok);

const badPack = {
  ...spamPack,
  sections: [
    {
      heading: "a",
      body: "비교해 보니 기준이 보였어요 — 카레클린트에서 실제로 비교해 보면 301 체어 전시를 고를 때 기준이 달라집니다.",
    },
    { heading: "b", body: "x" },
    { heading: "c", body: "y" },
  ],
};
const badGate = assessReadAloudHumanGate(badPack, input);
assert("template spam withhold", badGate.shouldWithhold);

const sovereign = applyWriterSovereignDeliveryPass(spamPack, input);
assert("sovereign pass stamped", sovereign._meta?.writerSovereignPass === true);
assert("no heavy polish flag", sovereign._meta?.writerSovereignBypassHeavyPolish !== false);
assert("read aloud meta", sovereign._meta?.readAloudHumanGate?.version);

const prompt = buildWriterSovereignPromptBlock("blog");
assert("prompt mentions power blogger", /파워블로거|20년/.test(prompt));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: writer sovereign pipeline");
