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
    { fact: "가족 단위 방문·주말 예약제 운영", source: "research" },
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
assert.ok(
  law.violations.some((v) =>
    ["engine_spam", "cross_brand_topic_leak", "topic_food_brand_furniture_mismatch"].includes(
      v.type
    )
  ),
  `violations: ${law.violations.map((v) => v.type).join(", ")}`
);

const contam = detectVisitReviewTemplateContamination(badPack, input);
assert.equal(contam.ok, false, "엔진 스팸 감지");

const vagueYeojuPack = {
  title: "여주목마 여름시즌 오픈 소식, 직접 둘러보고 정리해 봤습니다",
  sections: [
    {
      heading: "오픈 소식이 발길을 끌었습니다",
      body:
        "검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있다. 여름시즌 오픈 소식을 들으면 괜히 마음이 먼저 움직입니다.",
    },
    {
      heading: "오픈 소식이 발길을 끌었습니다 — 이어서",
      body:
        "시즌 오픈은 말만 붙이면 끝나는 일이 아니라, 찾아온 사람이 ‘아, 지금 와볼 만하구나’ 하고 느끼게 만들어야 힘이 생깁니다.",
    },
    {
      heading: "여름이라는 단어가 만든 방문의 리듬",
      body:
        "여름시즌 오픈 놀러오세요, 이 한마디는 생각보다 단순하지만 힘이 있습니다. 계절이 바뀌면 브랜드가 보여주는 얼굴도 바뀌어야 합니다.",
    },
    {
      heading: "가기 전에는 기대치를 차분히 잡는 편이 좋겠습니다",
      body: "궁금한 부분이 있다면 현장으로 향하기 전 최신 소식을 한 번 살펴보는 것이 좋겠습니다.",
    },
  ],
  conclusion: "여름을 시작하는 가벼운 나들이를 찾고 있다면, 이번 소식은 한 번쯤 확인해볼 만합니다.",
};

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "여름시즌 오픈 소식",
  industry: "레저/체험",
  researchFacts: [
    { fact: "실외 수영장·물놀이 시설 여름 시즌 오픈", source: "research" },
    { fact: "식당·카페·승마 체험이 한 공간에 연결", source: "research" },
    { fact: "가족 단위 방문객 동선·휴식 공간 구성", source: "research" },
  ],
};

const vagueAssessed = assessVisitReviewBenchmark(vagueYeojuPack, yeojuInput);
console.log(formatVisitReviewBenchmarkReport(vagueAssessed, "여주목마 추상 시즌 템플릿"));
assert.equal(vagueAssessed.publishOk, false, "추상 시즌 템플릿은 publishOk=false");
assert.ok(
  vagueAssessed.hardFails.some((f) =>
    ["engine_spam", "duplicate_headings", "research_underwoven", "abstract_season_filler", "concrete_facts_missing"].includes(f)
  ),
  `hardFails: ${vagueAssessed.hardFails.join(", ")}`
);

console.log("OK columnist-sovereign-engine");
