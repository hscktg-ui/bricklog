/**
 * 콘텐츠 평가 엔진 — 100점·placeholder FAIL·업종 계약
 */
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { evaluateReviseAndGateOutput } from "../lib/product/briclogEvaluateFirstPipeline.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  industry: "flower",
  region: "파주 운정",
  storeFeatures: "24시간 무인, 만원 꽃다발",
  topic: "여름 꽃 추천",
};

const dirty = {
  title: "여름",
  sections: [{ heading: "x", body: "이용 관련해서 전시 소식 이 구성 중립적으로 정리 비교가 수월해요" }],
};

const dirtyEval = assessContentEvaluation(dirty, flowerInput);
if (!dirtyEval.hardFail || dirtyEval.pass) {
  console.error("FAIL: emergency placeholders must hard-fail", dirtyEval);
  process.exit(1);
}

const good = {
  title: "파주 운정 여름 꽃 추천",
  sections: [
    {
      heading: "추천",
      body: "장미, 수국, 해바라기, 튤립을 고르기 좋습니다. 그랩앤고플라워는 파주 운정에서 24시간 무인으로 만원 꽃다발을 만날 수 있습니다.",
    },
    { heading: "팁", body: "거베라와 리본 포장으로 마무리하면 선물에 무난합니다." },
    { heading: "픽업", body: "무인 픽업으로 늦은 시간에도 부담이 적습니다." },
  ],
};

const goodEval = assessContentEvaluation(good, flowerInput);
if (goodEval.hardFail) {
  console.error("FAIL: good flower should not hard-fail", goodEval.hardReasons);
  process.exit(1);
}

const gated = evaluateReviseAndGateOutput(good, flowerInput);
console.log(
  JSON.stringify(
    {
      dirtyScore: dirtyEval.score,
      goodScore: goodEval.score,
      goodPass: goodEval.pass,
      outputAllowed: gated.outputAllowed,
      steps: gated.steps?.map((s) => s.id),
    },
    null,
    2
  )
);

console.log("OK: content evaluation engine");
