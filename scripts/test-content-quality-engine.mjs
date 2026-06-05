/**
 * Content Quality Engine — SSOT 검증
 */
import assert from "node:assert/strict";
import {
  assertPreWriteContentQuality,
  buildSupplementalResearchPlan,
  detectTopicCommonSenseViolations,
  scoreContentQuality,
  assertContentQualityForOutput,
} from "../lib/product/contentQualityEngine.js";
import { MIN_INFORMATION_UNITS } from "../lib/content/informationUnitEngine.js";

const petInput = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
  industry: "반려동물/간식",
  v4Speaker: "real_use",
  informationUnits: { unitCount: MIN_INFORMATION_UNITS },
  knowledgeCoverage: { coverageCount: 20 },
  searchExpansion: { searchQueries: ["a", "b", "c", "d", "e"] },
  researchFacts: Array.from({ length: 8 }, (_, i) => ({
    fact: `용인 더건강하개 간식 관련 확인된 사실 ${i + 1}번째 항목입니다.`,
    axis: i % 2 ? "topic" : "region",
  })),
  v2ResearchReady: true,
  knowledgeExpansionReady: true,
};

const thinPre = assertPreWriteContentQuality({
  brandName: "더건강하개",
  region: "용인",
  topic: "간식",
});
assert.equal(thinPre.ok, true, "axes only should allow write (input-grounded)");
assert.equal(thinPre.mode, "input_grounded");
const plan = buildSupplementalResearchPlan(
  petInput,
  thinPre.reasons
);
assert.ok(plan.plans.length >= 3, "supplemental research plan");

const topicBad = detectTopicCommonSenseViolations(
  "모션베드 체험과 헤드 각도를 비교했습니다.",
  petInput
);
assert.equal(topicBad.ok, false, "pet topic + furniture");

const goodPack = {
  title: "강아지 간식 알아보다 더건강하개를 알게 됐어요",
  representativeTitle: "강아지 간식 알아보다 더건강하개를 알게 됐어요",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "강아지 간식을 알아보다가 우연히 용인 더건강하개를 알게 됐습니다. 처음에는 종류만 궁금했는데 원재료를 꼼꼼히 보는 점이 눈에 들어왔어요.",
    },
    {
      heading: "매장에서 본 것",
      body: "직접 들러보니 진열이 깔끔했고, 직원이 알레르기 성분을 차분히 설명해 줬더라구요. 3월 행사 조건도 당일 안내로 확인했습니다.",
    },
    {
      heading: "인상",
      body: "브랜드를 보기 전에 내 강아지 입장에서 봤다는 점이 인상적이었습니다. 비교할 때는 원재료·가격·보관 방법을 같이 보면 편했어요.",
    },
    {
      heading: "누구에게",
      body: "처음 키우는 분이나 성분을 따지는 분에게 맞는 편이에요. 예산과 급여 일정만 정리해 두면 상담이 빨라요.",
    },
    {
      heading: "선택 기준",
      body: "용인 근처라면 방문 전 예약·영업 시간을 확인하고, 확인되지 않은 할인은 단정하지 말고 문의하는 게 안전해요.",
    },
  ],
  conclusion: "무리한 결정은 피하고 직접 확인한 뒤 선택하세요.",
};

const scored = scoreContentQuality(goodPack, petInput, petInput);
assert.ok(scored.humanEditorPass, "good narrative should pass editor", scored);

const out = assertContentQualityForOutput(goodPack, petInput, petInput);
assert.ok(out.passOutput);

const seoBad = scoreContentQuality(
  {
    ...goodPack,
    sections: [
      {
        heading: "소개",
        body: "용인 더건강하개 수제간식업체 소개합니다. 검색 최적화를 위해 키워드를 반복 삽입했습니다.",
      },
    ],
  },
  petInput,
  petInput
);
assert.equal(seoBad.humanEditorPass, false, "SEO stack should fail");

console.log("OK: content quality — pre-write, topic, narrative, SEO fail");
