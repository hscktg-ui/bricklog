/**
 * CUSTOMER QUESTION ENGINE — 작성 전 6대 질문 · 검수 게이트
 */
import {
  buildCustomerQuestionAnalysis,
  formatCustomerQuestionBrief,
  evaluateCustomerQuestionDelivery,
  CUSTOMER_QUESTION_MIN_COVERAGE,
} from "../lib/content/customerQuestionEngine.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
};

const analysis = buildCustomerQuestionAnalysis(input);
if (!analysis.ok || analysis.questions.length !== 6) {
  console.error("FAIL: expected 6 customer questions", analysis);
  process.exit(1);
}

const brief = formatCustomerQuestionBrief(analysis);
for (const label of [
  "왜 찾는가",
  "누가 찾는가",
  "언제 찾는가",
  "무엇을 비교하는가",
  "가장 많이 하는 질문",
  "구매 전 실수",
]) {
  if (!brief.includes(label)) {
    console.error("FAIL: brief missing label", label);
    process.exit(1);
  }
}
if (!brief.includes("주제 설명")) {
  console.error("FAIL: brief missing no-topic-description rule");
  process.exit(1);
}

const encyclopediaPack = {
  title: "모션베드란?",
  sections: [
    {
      heading: "모션베드 정의",
      body:
        "모션베드란 각도 조절이 가능한 침대입니다. 이 글에서는 모션베드에 대해 알아보겠습니다. 모션베드의 개념을 소개합니다. 모션베드는 침대의 한 종류로 정의할 수 있습니다.",
    },
    {
      heading: "모션베드 특징",
      body: "모션베드는 편안합니다. 모션베드는 인기 있습니다. 모션베드는 다양합니다.",
    },
  ],
};

const encyclopediaEval = evaluateCustomerQuestionDelivery(encyclopediaPack, {
  input: { ...input, customerQuestionMap: analysis },
});
if (encyclopediaEval.ok) {
  console.error("FAIL: encyclopedia-only pack should fail customer question gate");
  process.exit(1);
}
if (!encyclopediaEval.reasons.includes("topic_description_only")) {
  console.error("FAIL: expected topic_description_only", encyclopediaEval.reasons);
  process.exit(1);
}

const answerPack = {
  title: "평택에서 모션베드 행사 전에 확인할 것",
  sections: [
    {
      heading: "왜 지금 검색하나",
      body:
        "할인 기간 전후에 평택 템퍼 모션베드 조건을 비교하려는 분들이 많습니다. 이사·교체 시점에 방문 동선과 체험 포인트를 함께 확인하려는 목적입니다.",
    },
    {
      heading: "누구에게 맞나",
      body:
        "처음 모션베드를 알아보는 가족, 기존 침대 교체를 검토하는 부부, 평택 근처 매장을 찾는 분들이 주로 검색합니다.",
    },
    {
      heading: "비교·질문·실수",
      body:
        "무엇을 비교하나요? 구성·할인 조건·체험 방식·예약 방법을 비교합니다. 자주 묻는 질문: 어디서 예약하나요? 기간은 언제까지인가요? 구매 전 실수는 할인만 보고 설치·A/S·매장 위치를 놓치는 경우입니다.",
    },
    {
      heading: "방문 전 체크",
      body:
        "방문 전에 예약 가능 여부, 행사 대상 모델, 증정·카드 혜택을 확인하세요. 확인되지 않은 스펙은 단정하지 말고 매장에서 직접 체험하는 편이 안전합니다.",
    },
  ],
};

const answerEval = evaluateCustomerQuestionDelivery(answerPack, {
  input: { ...input, customerQuestionMap: analysis },
});
if (answerEval.coverage < CUSTOMER_QUESTION_MIN_COVERAGE) {
  console.error("FAIL: answer pack coverage too low", answerEval);
  process.exit(1);
}
if (!answerEval.ok) {
  console.error("FAIL: answer pack should pass", answerEval);
  process.exit(1);
}

const core = scoreCoreContent(answerPack, {
  input,
  brandName: input.brandName,
  region: input.region,
  topic: input.topic,
  customerQuestionMap: analysis,
}, "blog");
if ((core.failReasons || []).includes("topic_description_only")) {
  console.error("FAIL: core quality blocked good answer pack", core.failReasons);
  process.exit(1);
}

console.log("OK: customer question engine — brief, gate, core integration");
