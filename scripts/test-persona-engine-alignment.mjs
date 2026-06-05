/**
 * 화자 × 엔진 정렬 검증
 */
import assert from "node:assert/strict";
import {
  resolvePersonaEngineProfile,
  scorePersonaEngineAlignment,
  buildPersonaEnginePromptBlock,
} from "../lib/persona/personaEngineProfile.js";
import { applyV4SpeakerToInput } from "../lib/persona/v4Speakers.js";

const base = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
};

const visitPack = {
  sections: [
    {
      body: "강아지 간식을 고를 때 원재료를 먼저 보게 됐다. 왜 그런지 궁금해져서 직접 들러 보니 진열이 깔끔했고, 솔직히 인상이 좋았다.",
    },
    {
      body: "현장에서 확인한 성분 표와 행사 안내가 차분했고, 비교할 때는 성분·가격을 같이 봤다.",
    },
    {
      body: "처음 키우는 분에게 맞는 편이다. 예산과 일정만 정리해 두면 상담이 빨라진다.",
    },
  ],
};

const brandPack = {
  sections: [
    {
      body: "오늘은 더건강하개를 소개해드리겠습니다. 저희는 최고의 선택입니다.",
    },
  ],
};

const realUse = resolvePersonaEngineProfile(
  applyV4SpeakerToInput({ ...base, v4Speaker: "real_use" })
);
assert.equal(realUse.id, "real_use_field");

const visitScore = scorePersonaEngineAlignment(visitPack, {
  ...base,
  v4Speaker: "real_use",
});
assert.ok(visitScore.ok, "visit persona alignment", visitScore);

const brandScore = scorePersonaEngineAlignment(brandPack, {
  ...base,
  v4Speaker: "brand_intro",
});
assert.equal(brandScore.ok, false, "brand intro cliche should fail");

const prompt = buildPersonaEnginePromptBlock({
  ...base,
  v4Speaker: "column",
});
assert.ok(prompt.includes("PERSONA × ENGINE"));
assert.ok(prompt.includes("비교"));

console.log("OK: persona engine — v4 profiles, alignment, prompt");
