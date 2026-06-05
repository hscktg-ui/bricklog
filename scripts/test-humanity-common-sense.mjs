/**
 * Humanity & Common Sense Engine — SSOT 검증
 */
import assert from "node:assert/strict";
import {
  detectForcedEntityStacking,
  detectIndustryCommonSenseViolations,
  detectRegionCommonSenseViolations,
  detectSentenceStructureOveruse,
  scoreHumanityCommonSense,
  applyHumanityCommonSensePass,
} from "../lib/product/humanityCommonSenseEngine.js";
import { isMechanicalListingTitle } from "../lib/content/humanTitleEngine.js";

const ctx = { brandName: "더건강하개", region: "용인" };
const petInput = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
  industry: "반려동물/간식",
};

const badStack = {
  title: "용인 더건강하개 수제간식업체 소개",
  representativeTitle: "용인 더건강하개 수제간식업체 소개",
  sections: [
    {
      heading: "소개",
      body: "용인 더건강하개 수제간식업체 소개",
    },
    {
      heading: "안내",
      body: "용인 더건강하개 수제간식업체 소개",
    },
    {
      heading: "정리",
      body: "용인 더건강하개 수제간식업체 소개",
    },
  ],
};

const stack = detectForcedEntityStacking(badStack, ctx, petInput);
assert.equal(stack.ok, false, "entity stack should fail");

const goodNarrative = {
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

const senseGood = scoreHumanityCommonSense(goodNarrative, ctx, petInput);
assert.ok(senseGood.humanRead, "narrative pack should read human", senseGood);

const industryBad = detectIndustryCommonSenseViolations(
  "용인 더건강하개에서 모션베드 체험을 했습니다. 헤드 각도도 조절해 봤어요.",
  petInput
);
assert.equal(industryBad.ok, false, "pet + motion bed should fail");

const regionBad = detectRegionCommonSenseViolations(
  "용인 매장인데 부산 해운대 이야기가 나옵니다.",
  { region: "용인", topic: "간식" }
);
assert.equal(regionBad.ok, false, "wrong region should fail");

const tailRepeat = detectSentenceStructureOveruse(
  "첫 번째로 확인했습니다. 둘째로 비교했습니다. 셋째로 정리했습니다. 네 번째로 메모했습니다."
);
assert.equal(tailRepeat.ok, false, "formal tail repeat");

const fixed = applyHumanityCommonSensePass(
  {
    ...goodNarrative,
    sections: [
      ...goodNarrative.sections,
      {
        heading: "오염",
        body: "모션베드 체험과 헤드 각도 조절을 비교했습니다.",
      },
    ],
  },
  ctx,
  petInput
);
assert.ok(
  !/모션\s*베드|헤드\s*각도/.test(
    fixed.sections.map((s) => s.body).join("\n")
  ),
  "industry mismatch stripped"
);

assert.ok(
  isMechanicalListingTitle("용인 · 더건강하개 · 수제 간식", ctx, petInput),
  "dot-separated region·brand·topic stack is mechanical"
);
assert.ok(
  !isMechanicalListingTitle(goodNarrative.title, ctx, petInput),
  "narrative title is not mechanical"
);

console.log("OK: humanity common sense — stack, industry, region, narrative, apply pass");
