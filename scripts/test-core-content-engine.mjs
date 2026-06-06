/**
 * Core Content Engine — 정보 밀도 우선, 패딩·허구·업종 오염 차단 회귀
 */
import assert from "node:assert/strict";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import {
  applyCoreContentEngineGate,
  assertPrimaryDirectivePreWrite,
  assessPublishWithoutEditing,
  scorePreWriteChecklist,
} from "@/lib/product/coreContentEngine.js";
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection.js";
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock.js";
import { buildRewriteFromFeedback } from "@/lib/feedback/buildRewriteFromFeedback.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";

const DEFECT_RES = [
  [/당일\s*상담\s*메모/, "상담 메모 pad"],
  [/누워보니/, "furniture visit pad"],
  [/직접\s*다녀온/, "fictional visit heading"],
  [/#[\w가-힣]+/, "hashtag"],
  [/향와|질감와|성분와/, "broken particle"],
  [/확인해\s*확인해|둘러확인해/, "stutter pad"],
  [/쇼룸에서/, "showroom visit"],
  [/메모를\s*보강/, "memo padding"],
];

function runPipeline(input) {
  let pack = buildMissionProseFallbackPack(input);
  pack = applyHumanityFinishPass(pack, { input, ...input }, "blog");
  pack = applyCoreContentEngineGate(pack, input, { input });
  return pack;
}

function assertNoDefects(pack, input, label) {
  const full = [
    pack.title,
    pack.representativeTitle,
    getBlogFullText(pack),
    pack.conclusion,
    ...(pack.hashtags || []),
  ].join("\n");

  for (const [re, defectLabel] of DEFECT_RES) {
    assert.ok(!re.test(full), `${label}: defect ${defectLabel}`);
  }
  assert.equal((pack.hashtags || []).length, 0, `${label}: hashtags must be empty`);
  assert.ok(pack._meta?.coreEngineVersion, `${label}: core engine meta missing`);
  assert.ok(!/당일\s*상담\s*메모/.test(full), `${label}: consultation memo pad`);
}

function enrichInput(input) {
  return {
    ...input,
    knowledgeExpansionReady: true,
    informationUnits: { unitCount: 6 },
    customerQuestionMap: {
      questions: ["무엇인지", "선택 기준", "주의사항"],
    },
    researchFacts: [
      { fact: `${input.brandName} ${input.topic} 특징과 구성`, source: "research" },
      { fact: "선택 기준과 보관 방법", source: "research" },
      { fact: "대상 고객과 활용 방법", source: "research" },
    ],
  };
}

// 1) 수제간식 업체 소개 — informational, no visit pads
const snackInput = enrichInput({
  brandName: "더건강하개",
  region: "용인",
  topic: "수제간식업체 소개",
  mainKeyword: "수제간식업체 소개",
  blogLengthTier: "long",
});
assert.ok(isInformationalTopicInput(snackInput));
assert.ok(scorePreWriteChecklist(snackInput).ok, "pre-write checklist must pass");
assert.ok(assertPrimaryDirectivePreWrite(snackInput).ok, "primary pre-write gate");
const snackIntent = detectContentIntent(
  { topic: snackInput.topic, mainKeyword: snackInput.mainKeyword },
  snackInput
);
assert.notEqual(snackIntent.locked, "visit_review", "snack intro must not be visit_review");
const snackPack = runPipeline(snackInput);
assertNoDefects(snackPack, snackInput, "snack");

// 2) 마케팅 대행 — no furniture/pet contamination
const marketingInput = enrichInput({
  brandName: "해신기획",
  region: "서울",
  topic: "마케팅 대행 소개",
  mainKeyword: "마케팅 대행",
  industry: "마케팅",
  blogLengthTier: "medium",
});
const marketingPack = runPipeline(marketingInput);
assertNoDefects(marketingPack, marketingInput, "marketing");
const marketingFull = getBlogFullText(marketingPack);
assert.ok(
  detectIndustryCrossContamination(marketingFull, "marketing").ok,
  "marketing body must not cross-contaminate"
);
assert.ok(!/누워보니|매트리스|반려동물\s*간식/.test(marketingFull), "marketing: foreign industry");

// 3) 침대 프레임 — furniture context, informational intro
const bedInput = enrichInput({
  brandName: "에이스침대",
  region: "대구",
  topic: "침대 프레임 소개",
  mainKeyword: "침대 프레임",
  industry: "가구",
  blogLengthTier: "medium",
});
const bedPack = runPipeline(bedInput);
assertNoDefects(bedPack, bedInput, "furniture");
const bedFull = getBlogFullText(bedPack);
if (!allowsFictionalFor(bedInput)) {
  assert.ok(!/직접\s*다녀|상담\s*메모/.test(bedFull), "furniture intro: no fiction pads");
}

function allowsFictionalFor(input) {
  const intent = detectContentIntent(
    { topic: input.topic, mainKeyword: input.mainKeyword },
    input
  );
  return intent.locked === "visit_review";
}

// 4) 피드백 → 의도 변환 (원문 삽입 금지)
const fb = buildRewriteFromFeedback({
  reaction: "bad",
  tags: ["too_ad"],
  memo: "광고 같아요 너무 짧아요",
  channel: "blog",
});
assert.ok(fb.inputPatch.feedbackHints?.includes("reduce_ad_tone"));
assert.ok(fb.inputPatch.feedbackHints?.includes("add_information_units"));
assert.ok(!fb.feedbackText.includes("광고 같아요"), "raw memo must not appear in feedbackText");

// 5) 발행 가능 질문 — 패딩·허구 없음
const publishAudit = assessPublishWithoutEditing(snackPack, snackInput);
assert.ok(!/당일\s*상담|누워보니|직접\s*다녀/.test(getBlogFullText(snackPack)));
assert.equal(publishAudit.answer, publishAudit.publishReady ? "YES" : "NO");

// 6) 체크리스트 3개 미만 — 생성 금지
const thin = { brandName: "테스트", region: "서울", topic: "소개" };
assert.ok(!assertPrimaryDirectivePreWrite(thin).ok, "thin input must block pre-write");

console.log("OK core content engine");
console.log("snack chars:", getBlogFullText(snackPack).length, "densityFirst:", snackPack._meta?.densityFirst);
console.log("marketing chars:", marketingFull.length);
console.log("bed chars:", bedFull.length);
