/**
 * Columnist Sovereign + Delivery Law — 회귀 (국수나무 돈까스 등)
 */
import assert from "node:assert/strict";
import {
  needsColumnistSovereignUpgrade,
  isColumnistSovereignEligible,
  isColumnistSovereignEnabled,
} from "../lib/product/columnistSovereignEngine.js";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import { assertColumnistDeliveryLaw } from "../lib/product/columnistDeliveryLaw.js";
import { assessVisitReviewBenchmark, formatVisitReviewBenchmarkReport } from "../lib/product/visitReviewBenchmarkRubric.js";
import { detectVisitReviewTemplateContamination } from "../lib/content/visitReviewTopicGate.js";

const input = {
  brandName: "여주목마",
  region: "여주",
  topic: "국수나무 돈까스 소개",
  industry: "레저/체험",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "목장 내 식당에서 국수나무 브랜드 돈가스 메뉴 운영", source: "research" },
    { fact: "물놀이·승마 체험 후 식사 동선이 한 공간에 연결", source: "research" },
  ],
};

const badPack = {
  title: "여주에서 국수나무 돈까스 소개를 찾다 여주목마 다녀왔어요",
  sections: [
    {
      heading: "국수나무 돈까스 소개, 왜 지금 는지",
      body: "국수나무 돈까스 소개 알아보던 중 여주 여주목마가 눈에 들어왔어요. 여주목마 대표 서비스 방문·상담 전 덜 헷갈릴까요?",
    },
    {
      heading: "비교 기준",
      body: "여주 여주목마 현장 매장 현장 쇼룸 근처 쇼룸 목적별로 나눠 보면 기준이 조금씩 보였어요. 매장·상담에서 확인할 것.",
    },
  ],
  conclusion: "여주 여주목마 방문·체험 일정만 잡아도.",
};

const assessed = assessVisitReviewBenchmark(badPack, input);
console.log(formatVisitReviewBenchmarkReport(assessed, "사용자 다시받기 템플릿"));
assert.ok(assessed.score < 55, `템플릿은 55 미만 (got ${assessed.score})`);

if (isOpenAIConfigured() && isColumnistSovereignEnabled()) {
  assert.ok(isColumnistSovereignEligible(input, badPack), "조사+3축 → columnist eligible");
  assert.ok(needsColumnistSovereignUpgrade(badPack, input), "템플릿 스팸 → upgrade 필요");
  assert.ok(
    needsColumnistSovereignUpgrade(badPack, { ...input, regenDeliveryPolish: true }),
    "다시받기 → upgrade"
  );
} else {
  console.log("SKIP: OpenAI 미설정 — prod에서 columnist eligible·upgrade 검증");
}

const law = assertColumnistDeliveryLaw(badPack, input);
assert.equal(law.shouldWithhold, true, "송출 법칙 위반 → withhold");
assert.ok(law.violations.some((v) => v.type === "engine_spam"));

const contam = detectVisitReviewTemplateContamination(badPack, input);
assert.equal(contam.ok, false, "엔진 스팸 감지");

console.log("OK columnist-sovereign-engine");
