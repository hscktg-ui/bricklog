/**
 * Visit Review Sovereign — 라우팅·오염 감지 회귀
 */
import assert from "node:assert/strict";
import {
  isVisitReviewSovereignEligible,
  needsVisitReviewSovereignUpgrade,
} from "../lib/product/visitReviewSovereignEngine.js";
import { isVisitReviewTopicInput } from "../lib/content/topicFacetEngine.js";
import { detectVisitReviewTemplateContamination } from "../lib/content/visitReviewTopicGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "실외 수영장 오픈소식 솔직후기",
  mainKeyword: "여주목마",
  industry: "레저/체험",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "식사·카페·휴식 공간과 실외 수영장이 한 공간에서 이어지는 복합 문화공간", source: "research" },
    { fact: "가족 단위 방문객에게 물놀이 후 식사·휴식 동선이 편함", source: "research" },
    { fact: "운영 일정·이용 요금은 시즌에 따라 달라질 수 있음", source: "research" },
  ],
};

assert.ok(isVisitReviewTopicInput(yeojuInput), "여주목마 주제는 방문 후기");
assert.ok(isVisitReviewSovereignEligible(yeojuInput), "sovereign eligible");

const templatePack = {
  title: "여주목마 솔직 후기, 실외 수영장 오픈소식",
  sections: [
    {
      heading: "실외 수영장 오픈소식, 왜 지금 는지",
      body: "여주목마 안내 볼 때 어떤 순서로 비교하면 덜 헷갈릴까요? 여주목마 대표 서비스 방문·상담 전 확인할 것입니다.",
    },
    {
      heading: "비교 기준",
      body: "비교해 보니 가격보다 방문 동선이 먼저 정리됐어요. 비교가 수월합니다.",
    },
  ],
};

assert.ok(
  needsVisitReviewSovereignUpgrade(templatePack, yeojuInput),
  "템플릿 스팸 팩은 sovereign 업그레이드 필요"
);

const contam = detectVisitReviewTemplateContamination(templatePack, yeojuInput);
assert.equal(contam.ok, false, "엔진 스팸 오염 감지");

assert.ok(
  /덜\s*헷갈릴까요/.test(getBlogFullText(templatePack)),
  "템플릿 스팸 문구 포함"
);

const sovereignPack = {
  title: "여주목마 실외 수영장 오픈 소식, 직접 둘러본 후기",
  sections: [
    {
      heading: "처음 도착해서 느낀 분위기",
      body: "여름이 다가오면서 물놀이 장소를 찾는 분들이 많아지는 시기입니다. 여주목마에 도착하니 식사와 카페, 휴식이 한 흐름으로 이어지는 공간이었습니다.",
    },
    {
      heading: "실외 수영장의 장점",
      body: "탁 트인 공간감 아래에서 즐기는 물놀이는 실내와는 다른 즐거움이 있었습니다. 아이들이 뛰어놀기 좋은 구성도 인상적이었습니다.",
    },
  ],
  _meta: { visitReviewSovereignLlm: true, llmGenerated: true },
};

assert.equal(
  needsVisitReviewSovereignUpgrade(sovereignPack, yeojuInput),
  false,
  "이미 sovereign LLM 팩은 재작성 불필요"
);

console.log("OK visit-review-sovereign-engine");
