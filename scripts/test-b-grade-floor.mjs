/**
 * B등급(76+) 송출 SSOT 회귀 — 완성도 미달 시 하한·B 등급 미적용
 */
import assert from "node:assert/strict";
import {
  B_GRADE_MIN_SCORE,
  applyBGradeQualityPass,
  assessBGradeDeliveryEligible,
  calibrateSqToBGradeMinimum,
  isBriclogBGradeFloorEnabled,
} from "@/lib/product/bGradeDeliveryEngine.js";
import {
  computeContentQualityValue,
  stampContentQualityValue,
} from "@/lib/product/contentQualityValue.js";
import { stampDeliveryGradeMeta, DELIVERY_GRADE } from "@/lib/product/deliveryGrade.js";
import { needsBGradePass, needsWriterEnginePass } from "@/lib/product/humanTierRegen.js";
import { resolvePublishGrade } from "@/lib/product/publishGradeDisplay.js";

const prevMission = process.env.BRICLOG_MISSION;
const prevMax = process.env.BRICLOG_MAX_QUALITY;
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_MAX_QUALITY = "false";

assert.ok(isBriclogBGradeFloorEnabled(), "B grade floor enabled with mission");

const input = {
  brandName: "그랩앤고플라워",
  region: "운정",
  topic: "여름철 꽃 추천",
  industry: "flower",
  storeFeatures: "24시간 무인",
  blogLengthTier: "standard",
};

const thinPack = {
  title: "여름철 꽃 추천",
  sections: [
    {
      heading: "정리",
      body: "여름철에는 수국과 해바라기가 잘 어울립니다. 운정 그랩앤고플라워 24시간 무인 매장에서 만원대 꽃다발을 픽업할 수 있어 바쁜 일정에도 부담이 적습니다. 색감이 선명한 계절 꽃은 선물용으로도 자주 고릅니다.",
    },
    {
      heading: "비교",
      body: "수국은 부드러운 색감이 특징이고 해바라기는 밝은 인상을 줍니다. 같은 예산대라도 꽃 종류에 따라 분위기가 달라지므로 받는 분의 취향을 먼저 떠올려 보시면 고르기 쉽습니다.",
    },
    {
      heading: "마무리",
      body: "방문 전 주차는 매장 안내를 기준으로 확인하면 됩니다. 픽업 시간을 미리 정해 두면 대기 없이 수령할 수 있습니다.",
    },
  ],
  _meta: { llmGenerated: true, contentQualityDelivered: true },
};

const eligible = assessBGradeDeliveryEligible(thinPack, input);
assert.equal(eligible.ok, false, "thin pack must not be B-floor eligible");

const rawSq = {
  version: "v3-editor",
  score: 58,
  grade: "D",
  publishReady: false,
  reasons: ["human_belief_low", "persona_misaligned"],
  breakdown: {},
};

const notFloored = calibrateSqToBGradeMinimum(rawSq, thinPack, input);
assert.ok(notFloored.score < B_GRADE_MIN_SCORE, "B floor must not apply to thin pack");
assert.notEqual(notFloored.bGradeFloor, true);

const stamped = stampContentQualityValue(thinPack, input);
assert.ok(
  (stamped._meta?.sqv?.score ?? 0) < B_GRADE_MIN_SCORE,
  `diagnostic SQV below B: ${stamped._meta?.sqv?.score}`
);
assert.ok(
  typeof stamped._meta?.sqv?.completionRatio === "number",
  "completionRatio on stamped SQV"
);

const withDelivery = stampDeliveryGradeMeta(stamped, input);
assert.ok(
  withDelivery._meta?.deliveryGrade === DELIVERY_GRADE.DRAFT ||
    withDelivery._meta?.deliveryGrade === DELIVERY_GRADE.HUMAN,
  `delivery grade for thin pack: ${withDelivery._meta?.deliveryGrade}`
);

const publishGrade = resolvePublishGrade({
  publishScore: stamped._meta?.sqv?.score,
  sqvGrade: stamped._meta?.sqv?.grade,
});
assert.ok(
  publishGrade.id !== "A",
  `thin pack UI grade must not be A: ${publishGrade.id}`
);

const improved = applyBGradeQualityPass(thinPack, input);
assert.ok(improved._meta?.bGradeQualityPass, "B grade quality pass stamped");
const improvedSq = computeContentQualityValue(improved, input);
assert.ok(
  (improvedSq.score ?? 0) < B_GRADE_MIN_SCORE || improvedSq.completionRatio < 0.88,
  "improved thin pack still diagnostic-capped or below B"
);

assert.equal(needsBGradePass({ sections: [] }, input), false, "empty pack skips B pass");
assert.ok(
  typeof needsWriterEnginePass(improved, input) === "boolean",
  "writer engine pass resolves"
);

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;

console.log("test-b-grade-floor: OK");
