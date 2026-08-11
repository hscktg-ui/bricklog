/**
 * Quality Aug 2026 stack — 기술 카탈로그·finish·Safe Edit 회귀
 */
import assert from "node:assert/strict";
import {
  QUALITY_AUG2026_STACK_VERSION,
  QUALITY_AUG2026_TECHNOLOGIES,
  summarizeQualityAug2026Stack,
  applyQualityAug2026Finish,
  stampQualityAug2026Stack,
} from "../lib/product/qualityAug2026Stack.js";
import { applyParagraphSafeEdit } from "../lib/golden/paragraphSafeEditEngine.js";
import { CONTENT_EVAL_WEIGHTS } from "../lib/product/contentEvaluationEngine.js";
import { CORE1_BELIEF_FLOOR_BLOG } from "../lib/product/briclogCoreRules.js";
import { HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { shouldWithholdUneditedPublish } from "../lib/product/uneditedPublishGradeGate.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_ALWAYS_DELIVER = "true";

assert.equal(QUALITY_AUG2026_STACK_VERSION, "quality-aug2026-v1");
assert.ok(QUALITY_AUG2026_TECHNOLOGIES.length >= 15);
assert.equal(CORE1_BELIEF_FLOOR_BLOG, HUMAN_BELIEF_MIN_SCORE);
assert.equal(CONTENT_EVAL_WEIGHTS.searchIntent, 20);
assert.equal(CONTENT_EVAL_WEIGHTS.industryFit, 20);
assert.equal(CONTENT_EVAL_WEIGHTS.brandReflection, 15);
assert.equal(CONTENT_EVAL_WEIGHTS.informationDensity, 15);
assert.equal(CONTENT_EVAL_WEIGHTS.humanVoice, 10);
assert.equal(CONTENT_EVAL_WEIGHTS.repetition, 10);
assert.equal(CONTENT_EVAL_WEIGHTS.placeholder, 10);

const summary = summarizeQualityAug2026Stack();
assert.equal(summary.asOf, "2026-08-11");
assert.equal(summary.enforced, true);

const pensionInput = {
  brandName: "바람언덕 펜션",
  industry: "pension",
  region: "강원 평창",
  storeFeatures: "바베큐장, 온수풀, 산뷰 객실",
  topic: "주말 바베큐 패키지",
};

const dirty = {
  title: "평창 펜션",
  sections: [
    {
      heading: "안내",
      body: "바베큐 패키지 안내을 보면 이용 관련해서 좋은내용이 있습니다. 온수풀은 특징입니다.",
    },
  ],
};

const edited = applyParagraphSafeEdit(dirty, pensionInput);
const editedFull = edited.sections.map((s) => s.body).join(" ");
assert.ok(!/안내을/.test(editedFull), "truncated particle must be fixed");
assert.ok(!/좋은내용/.test(editedFull), "placeholder scrub");

const finished = applyQualityAug2026Finish(dirty, pensionInput, { force: true });
assert.ok(finished._meta?.qualityAug2026Stack?.version);
assert.ok(finished._meta?.structureScore);

const stamped = stampQualityAug2026Stack(finished, pensionInput);
assert.equal(stamped._meta?.qualityAug2026Version, QUALITY_AUG2026_STACK_VERSION);

const salonInput = {
  brandName: "루나헤어",
  industry: "salon",
  region: "서울 성수",
  storeFeatures: "커트, 펌, 두피 케어",
  topic: "여름 펌 상담",
};
const salonPack = {
  title: "성수 루나헤어 여름 펌",
  sections: [
    {
      heading: "상담",
      body: "루나헤어는 서울 성수에서 커트·펌·두피 케어 상담을 합니다. 실제로 시술받아 보면 모발 상태에 맞춰 코스가 달라집니다.",
    },
    {
      heading: "예약",
      body: "여름 펌은 예약이 빨리 차서 상담을 먼저 잡는 편이 수월합니다.",
    },
  ],
};
const salonEval = assessContentEvaluation(salonPack, salonInput);
assert.ok(
  !salonEval.hardReasons.includes("industry_salon_markers_missing"),
  "salon markers should pass"
);

const salvagePack = {
  title: "테스트",
  sections: [{ heading: "본문", body: "현장 포인트가 정리된 본문입니다. ".repeat(40) }],
  _meta: {
    qualityLeapSalvage: true,
    visitReviewBenchmarkOk: true,
    visitReviewBenchmark: { publishOk: true, score: 80, grade: "B+", hardFails: [] },
  },
};
const withhold = shouldWithholdUneditedPublish(salvagePack, pensionInput);
assert.equal(withhold.withhold, false);
assert.equal(withhold.salvageDeliver, true);

console.log(
  JSON.stringify(
    {
      technologies: QUALITY_AUG2026_TECHNOLOGIES.length,
      weights: CONTENT_EVAL_WEIGHTS,
      beliefFloor: CORE1_BELIEF_FLOOR_BLOG,
      salonScore: salonEval.score,
      salvageDeliver: withhold.salvageDeliver,
    },
    null,
    2
  )
);
console.log("OK: quality aug2026 stack");
