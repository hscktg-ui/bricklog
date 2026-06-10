/**
 * 품질 신뢰도 KPI — 100건 중 90% readable 목표 (fixture 기준선)
 */
import { measureQualityTrustKpi } from "../lib/quality/qualityTrustKpi.js";
import { assessBriclogResetQualityGate } from "../lib/product/briclogResetQualityGate.js";
import { runIndustryPipelineSanitize } from "../lib/product/industryPipelineRouter.js";
import { injectBrandFactsIntoPack } from "../lib/content/brandFactInjectionEngine.js";
import { scrubPlaceholderFromPack } from "../lib/content/placeholderTraceEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  industry: "flower",
  region: "파주 운정",
  storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
  topic: "여름 꽃 추천",
};

function polishPipelineFixture(pack, input) {
  let next = runIndustryPipelineSanitize(pack, input);
  next = scrubPlaceholderFromPack(next);
  next = injectBrandFactsIntoPack(next, input);
  return next;
}

const cases = [
  {
    label: "placeholder_fail",
    input: flowerInput,
    pack: {
      title: "여름 꽃",
      sections: [{ heading: "전시", body: "이용 관련해서를 보면 좋은내용 이 구성." }],
    },
  },
  {
    label: "intrusion_fail",
    input: flowerInput,
    pack: {
      title: "꽃집",
      sections: [
        { heading: "안내", body: "알레르기 성분과 전시 관련 조건을 확인하세요." },
        { heading: "b", body: "내용." },
        { heading: "c", body: "내용." },
      ],
    },
  },
  {
    label: "good_flower",
    input: flowerInput,
    pack: {
      title: "파주 운정 여름 꽃 추천",
      sections: [
        {
          heading: "장미와 수국",
          body: "여름에는 장미, 수국, 해바라기가 자주 찾습니다. 그랩앤고플라워는 파주 운정에서 24시간 무인으로 만원 꽃다발을 고를 수 있습니다.",
        },
        {
          heading: "튤립",
          body: "튤립과 거베라는 선물용으로 무난합니다. 무인 픽업이라 늦은 시간에도 부담이 적습니다.",
        },
        {
          heading: "팁",
          body: "리본과 메시지 카드로 마무리하면 전달이 수월합니다.",
        },
      ],
    },
  },
  {
    label: "cafe_good",
    input: {
      brandName: "모닝브런치",
      industry: "cafe",
      region: "서울 강남",
      storeFeatures: "브런치, 원두 로스팅, 테라스",
      topic: "주말 브런치 메뉴",
    },
    pack: {
      title: "강남 모닝브런치 주말 브런치",
      sections: [
        {
          heading: "메뉴",
          body: "모닝브런치는 서울 강남에서 브런치와 원두 로스팅을 함께 즐길 수 있습니다. 테라스 좌석은 주말에 빨리 찹니다.",
        },
        {
          heading: "예약",
          body: "주말 브런치 메뉴는 11시 전에 방문하면 여유롭습니다.",
        },
        {
          heading: "분위기",
          body: "가벼운 대화에 맞는 테이블 간격이 편안합니다.",
        },
      ],
    },
  },
];

const report = measureQualityTrustKpi(
  cases.map((c) => ({
    ...c,
    pack:
      c.label.startsWith("good") || c.label.endsWith("_good")
        ? polishPipelineFixture(c.pack, c.input)
        : c.pack,
  }))
);
console.log(
  JSON.stringify(
    {
      total: report.total,
      readable: report.readable,
      rate: report.rate,
      targetMet: report.targetMet,
      labels: report.results.map((r) => ({
        label: r.label,
        readable: r.readable,
        score: r.score,
      })),
    },
    null,
    2
  )
);

if (report.results.find((r) => r.label === "placeholder_fail")?.readable) {
  console.error("FAIL: placeholder case must not be readable");
  process.exit(1);
}
const goodFlowerGate = assessBriclogResetQualityGate(
  polishPipelineFixture(cases[2].pack, cases[2].input),
  cases[2].input
);
if (goodFlowerGate.hardFail) {
  console.error("FAIL: polished good flower must not hard-fail", goodFlowerGate.reasons);
  process.exit(1);
}
if (!goodFlowerGate.checks?.brandFacts?.ok) {
  console.error("FAIL: good flower must include brand facts");
  process.exit(1);
}
if (!goodFlowerGate.checks?.searchIntent?.ok) {
  console.error("FAIL: good flower must satisfy search intent");
  process.exit(1);
}

console.log("OK: quality trust KPI fixture baseline (bad=blocked, good=pipeline-clean)");
