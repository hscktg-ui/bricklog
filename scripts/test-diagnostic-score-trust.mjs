/**
 * 진단 점수 신뢰도 — 완성도 대비 A/90+ 과대 책정 방지 회귀
 */
import assert from "node:assert/strict";
import {
  computeBlogCompletionRatio,
  applyDiagnosticScoreTrust,
  completionScoreCap,
  isDiagnosticGradeInflated,
} from "@/lib/product/diagnosticScoreTrust.js";
import {
  calibrateSqToAGradeMinimum,
  assessAGradeBlogEligible,
  A_GRADE_MIN_SCORE,
} from "@/lib/product/aGradeDeliveryEngine.js";
import {
  computeContentQualityValue,
  stampContentQualityValue,
} from "@/lib/product/contentQualityValue.js";
import { A_GRADE_MIN_SCORE as A_MIN } from "@/lib/product/aGradeDeliveryEngine.js";

const prevMission = process.env.BRICLOG_MISSION;
process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  industry: "티카페",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
};

const thinPack = {
  title: "가을 시즌 티 메뉴",
  sections: [
    {
      heading: "첫인상",
      body: "경주 다온티하우스에 들어서면 창가 단독석이 먼저 눈에 들어옵니다. 가을 시즌 티 메뉴를 찾다가 매장 분위기부터 살펴봤어요.",
    },
    {
      heading: "메뉴",
      body: "밤차와 사과차가 진열대에 올라와 있었습니다. 향이 부드러워 오후에 앉기 좋았어요.",
    },
  ],
  _meta: { llmGenerated: true, contentQualityDelivered: true },
};

const thinRatio = computeBlogCompletionRatio(thinPack, input);
assert.ok(thinRatio < 0.35, `thin pack ratio too high: ${thinRatio}`);

const thinEligible = assessAGradeBlogEligible(thinPack, input);
assert.equal(thinEligible.ok, false, "thin pack must not be A-floor eligible");

const inflated = {
  score: 92,
  grade: "A",
  publishReady: true,
  reasons: [],
};
const trusted = applyDiagnosticScoreTrust(inflated, thinPack, input, "blog");
assert.ok(trusted.score < A_MIN, `thin pack score should cap below A: ${trusted.score}`);
assert.ok(trusted.score <= completionScoreCap(thinRatio), "score must respect completion cap");
assert.equal(trusted.publishReady, false, "thin pack must not be publishReady");
assert.ok(isDiagnosticGradeInflated(trusted), "should flag inflated grade");

const rawSq = {
  version: "v3-editor",
  score: 62,
  grade: "D",
  publishReady: false,
  reasons: ["human_belief_low"],
  breakdown: {},
};
const notFloored = calibrateSqToAGradeMinimum(rawSq, thinPack, input);
assert.ok(notFloored.score < A_GRADE_MIN_SCORE, "A floor must not apply to thin pack");

const thinSq = computeContentQualityValue(thinPack, input);
assert.ok(
  (thinSq.score ?? 0) < A_GRADE_MIN_SCORE,
  `thin SQV must stay below A: ${thinSq.score} grade ${thinSq.grade}`
);
assert.ok(
  typeof thinSq.completionRatio === "number",
  "SQV must include completionRatio"
);

const stamped = stampContentQualityValue(thinPack, input);
assert.ok((stamped._meta?.sqv?.score ?? 0) < A_GRADE_MIN_SCORE);

console.log("OK: diagnostic-score-trust", {
  thinRatio,
  thinScore: thinSq.score,
  thinGrade: thinSq.grade,
  cap: thinSq.completionScoreCap,
  calibrated: thinSq.calibratedScore,
});

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
