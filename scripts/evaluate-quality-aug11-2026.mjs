/**
 * 2026-08-11 글 품질 평가 스냅샷 — fixture + 아티팩트 리포트
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { assessBriclogResetQualityGate } from "../lib/product/briclogResetQualityGate.js";
import { assessContentTrustReadable, measureQualityTrustKpi } from "../lib/quality/qualityTrustKpi.js";
import { assessStructureScore } from "../lib/quality/structureScoreKpi.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { evaluateReviseAndGateOutput } from "../lib/product/briclogEvaluateFirstPipeline.js";
import { applyQualityAug2026Finish, summarizeQualityAug2026Stack } from "../lib/product/qualityAug2026Stack.js";
import { runIndustryPipelineSanitize } from "../lib/product/industryPipelineRouter.js";
import { injectBrandFactsIntoPack } from "../lib/content/brandFactInjectionEngine.js";
import { scrubPlaceholderFromPack } from "../lib/content/placeholderTraceEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "artifacts", "quality-aug11-2026");
fs.mkdirSync(outDir, { recursive: true });

function polish(pack, input) {
  let next = runIndustryPipelineSanitize(pack, input);
  next = scrubPlaceholderFromPack(next);
  next = injectBrandFactsIntoPack(next, input);
  next = applyQualityAug2026Finish(next, input, { force: true, forceSafeEdit: true });
  return next;
}

const cases = [
  {
    label: "flower",
    input: {
      brandName: "그랩앤고플라워",
      industry: "flower",
      region: "파주 운정",
      storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
      topic: "여름 꽃 추천",
      v4Speaker: "plain_review",
    },
    pack: {
      title: "파주 운정 여름 꽃 추천 — 직접 보고 고른 메모",
      sections: [
        {
          heading: "먼저 본 구성",
          body: "파주 운정 그랩앤고플라워에 직접 가 보니 장미·수국·해바라기·튤립이 한눈에 들어옵니다. 24시간 무인으로 만원 꽃다발을 고를 수 있어, 한 다발씩 들어보면 줄기 굵기 차이가 느껴집니다. 거베라를 섞을지 솔직히 고민했는데, 선물에 무난한 편이었어요.",
        },
        {
          heading: "픽업 동선",
          body: "무인 픽업이라 늦은 시간에도 부담이 적었어요. 리본과 메시지 카드까지 맞춰 두면 전달이 수월합니다. 현장에서 보면 포장 테이블이 짧게 이어져 동선이 복잡하지 않습니다. 다녀온 뒤에 메모해 두면 다음에도 헷갈리지 않습니다.",
        },
        {
          heading: "고르는 팁",
          body: "여름에는 수분이 빨리 빠지니 수국·해바라기를 먼저 보고, 장미는 봉오리 상태로 고르는 편이 낫습니다. 그랩앤고플라워 만원 구성은 비교해 보면 괜찮은 편입니다.",
        },
      ],
    },
  },
  {
    label: "cafe",
    input: {
      brandName: "모닝브런치",
      industry: "cafe",
      region: "서울 강남",
      storeFeatures: "브런치, 원두 로스팅, 테라스",
      topic: "주말 브런치 메뉴",
      v4Speaker: "plain_review",
    },
    pack: {
      title: "강남 주말 브런치 메뉴 — 모닝브런치 방문 후기",
      sections: [
        {
          heading: "메뉴와 자리",
          body: "모닝브런치에 직접 방문해 보니 서울 강남에서 브런치와 원두 로스팅을 함께 즐길 수 있습니다. 테라스 좌석은 주말에 빨리 차서, 분위기와 소음 밸런스가 먼저 눈에 들어옵니다. 라떼는 산미가 과하지 않아 식사와 잘 맞았습니다.",
        },
        {
          heading: "예약·타이밍",
          body: "주말 브런치 메뉴는 11시 전에 가면 여유롭습니다. 실제로 가 보면 웨이팅이 덜하고, 디저트까지 이어서 먹기 수월합니다. 솔직히 줄 설까 고민했는데 다행이었어요.",
        },
        {
          heading: "분위기",
          body: "가벼운 대화에 맞는 테이블 간격이 편안합니다. 인테리어가 번잡하지 않아 오래 앉아 있어도 부담이 적었어요. 다녀온 메모로 남깁니다.",
        },
      ],
    },
  },
  {
    label: "pension",
    input: {
      brandName: "바람언덕 펜션",
      industry: "pension",
      region: "강원 평창",
      storeFeatures: "바베큐장, 온수풀, 산뷰 객실",
      topic: "주말 바베큐 패키지",
      v4Speaker: "plain_review",
    },
    pack: {
      title: "평창 주말 바베큐 패키지 — 바람언덕 펜션 다녀온 메모",
      sections: [
        {
          heading: "패키지 동선",
          body: "바람언덕 펜션에 직접 가 보니 강원 평창에서 바베큐장·온수풀·산뷰 객실을 함께 씁니다. 주말 바베큐 패키지를 써 보면 체크인 후 테라스까지 동선이 짧게 느껴집니다. 예약만 맞춰 두면 대기 부담이 적습니다.",
        },
        {
          heading: "객실·뷰",
          body: "산뷰 객실에 들어서면 창밖이 먼저 눈에 들어옵니다. 조식보다 바베큐에 무게를 둔 구성이라, 실제로 써 보면 저녁 동선이 더 중요합니다. 솔직히 뷰만 보고 골랐는데 다행이었어요.",
        },
        {
          heading: "온수풀",
          body: "온수풀 시간을 미리 잡으면 여유롭습니다. 현장에서 보면 가족 단위 예약이 많아 오전 슬롯이 무난한 편입니다. 다녀온 뒤에 메모해 두면 다음에도 헷갈리지 않습니다.",
        },
      ],
    },
  },
  {
    label: "salon",
    input: {
      brandName: "루나헤어",
      industry: "salon",
      region: "서울 성수",
      storeFeatures: "커트, 펌, 두피 케어",
      topic: "여름 펌 상담",
      v4Speaker: "plain_review",
    },
    pack: {
      title: "성수 여름 펌 상담 — 루나헤어 다녀온 기록",
      sections: [
        {
          heading: "상담",
          body: "루나헤어에 직접 방문해 보니 서울 성수에서 커트·펌·두피 케어 상담을 합니다. 실제로 시술받아 보면 모발 상태에 맞춰 코스가 달라지고, 펌 전 상담이 생각보다 깁니다. 그 길이가 결과를 좌우하는 느낌이었어요.",
        },
        {
          heading: "예약",
          body: "여름 펌은 예약이 빨리 차서 상담을 먼저 잡는 편이 수월합니다. 현장에서 보면 스타일 북보다 두피 케어 설명이 먼저 나와 부담이 적었습니다. 솔직히 과한 추천일까 고민했는데 다행이었어요.",
        },
        {
          heading: "마무리",
          body: "커트 마감 후 거울로 직접 확인해 보면 펌 결이 눈에 들어옵니다. 성수 루나헤어는 상태 설명이 많아 신뢰가 갔습니다. 다녀온 메모로 남깁니다.",
        },
      ],
    },
  },
  {
    label: "restaurant",
    input: {
      brandName: "한끼담",
      industry: "restaurant",
      region: "부산 광안리",
      storeFeatures: "코스 요리, 오션뷰 좌석, 주차",
      topic: "주말 코스 예약",
      v4Speaker: "plain_review",
    },
    pack: {
      title: "광안리 주말 코스 예약 — 한끼담 다녀온 후기",
      sections: [
        {
          heading: "메뉴",
          body: "한끼담에 직접 가 보니 부산 광안리에서 코스 요리와 오션뷰 좌석을 함께 즐깁니다. 주말 코스 예약을 해 두고 가니 웨이팅보다 나았고, 요리 간격이 급하지 않아 대화가 편했습니다.",
        },
        {
          heading: "좌석·뷰",
          body: "오션뷰 좌석에 앉으면 분위기와 소음이 먼저 느껴집니다. 맛은 자극이 과하지 않아 코스 후반까지 무난했습니다. 솔직히 뷰만 볼까 고민했는데 음식이 받쳐 줬어요.",
        },
        {
          heading: "주차",
          body: "주차 동선을 미리 직접 확인해 두면 식사 흐름이 수월합니다. 광안리 한끼담은 주말에도 예약만 있으면 부담이 적었어요. 다녀온 메모로 남깁니다.",
        },
      ],
    },
  },
  {
    label: "dirty_placeholder",
    input: {
      brandName: "그랩앤고플라워",
      industry: "flower",
      region: "파주 운정",
      storeFeatures: "24시간 무인",
      topic: "여름 꽃",
    },
    pack: {
      title: "여름",
      sections: [{ heading: "x", body: "이용 관련해서 좋은내용 전시 소식" }],
    },
    expectFail: true,
  },
];

const detailed = cases.map((c) => {
  const base = c.expectFail ? c.pack : polish(c.pack, c.input);
  const eval_ = assessContentEvaluation(base, c.input);
  const reset = assessBriclogResetQualityGate(base, c.input);
  const trust = assessContentTrustReadable(base, c.input);
  const structure = assessStructureScore(base, c.input);
  const belief = scoreHumanBelief(getBlogFullText(base), { input: c.input }, base);
  const gated = c.expectFail ? null : evaluateReviseAndGateOutput(base, c.input);
  return {
    label: c.label,
    expectFail: Boolean(c.expectFail),
    contentEval: {
      score: eval_.score,
      pass: eval_.pass,
      hardFail: eval_.hardFail,
      reasons: eval_.hardReasons,
    },
    reset: {
      score: reset.score,
      ok: reset.ok,
      withhold: reset.shouldWithhold,
      reasons: reset.reasons?.slice(0, 6),
    },
    trust: {
      readable: trust.readable,
      structureOk: trust.structureOk,
      score: trust.score,
    },
    structure: { score: structure.score, ok: structure.ok, parts: structure.parts },
    belief: { score: belief.score, ok: belief.ok },
    outputAllowed: gated?.outputAllowed ?? false,
    augStack: base._meta?.qualityAug2026Stack?.version || base._meta?.qualityAug2026Version || null,
  };
});

const trustReport = measureQualityTrustKpi(
  cases
    .filter((c) => !c.expectFail)
    .map((c) => ({ label: c.label, input: c.input, pack: polish(c.pack, c.input) }))
);

const stack = summarizeQualityAug2026Stack();
const report = {
  asOf: "2026-08-11",
  generatedAt: new Date().toISOString(),
  stack,
  verdict: {
    trustRate: trustReport.rate,
    trustTarget: trustReport.target,
    trustTargetMet: trustReport.targetMet,
    readable: trustReport.readable,
    totalGoodCases: trustReport.total,
    dirtyBlocked: detailed.find((d) => d.label === "dirty_placeholder")?.contentEval?.hardFail === true,
    avgEvalScore:
      detailed.filter((d) => !d.expectFail).reduce((a, d) => a + d.contentEval.score, 0) /
      Math.max(1, detailed.filter((d) => !d.expectFail).length),
    avgBelief:
      detailed.filter((d) => !d.expectFail).reduce((a, d) => a + d.belief.score, 0) /
      Math.max(1, detailed.filter((d) => !d.expectFail).length),
  },
  cases: detailed,
  technologiesImplemented: stack.technologies,
  priorArtifactGap: {
    note: "2026-06~07 배치: ten-post pass 60% · SLA 20% · category trust 미달. 본 스택은 평가 축·Safe Edit·업종 일반화·always-deliver salvage를 코드에 고정.",
  },
};

fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(
  path.join(outDir, "latest-summary.json"),
  JSON.stringify(
    {
      asOf: report.asOf,
      trustRate: report.verdict.trustRate,
      trustTargetMet: report.verdict.trustTargetMet,
      avgEvalScore: Math.round(report.verdict.avgEvalScore * 10) / 10,
      avgBelief: Math.round(report.verdict.avgBelief * 10) / 10,
      dirtyBlocked: report.verdict.dirtyBlocked,
      techCount: report.technologiesImplemented.length,
      cases: detailed.map((d) => ({
        label: d.label,
        eval: d.contentEval.score,
        trust: d.trust.readable,
        structure: d.structure.score,
        belief: d.belief.score,
        outputAllowed: d.outputAllowed,
      })),
    },
    null,
    2
  ),
  "utf8"
);

console.log(JSON.stringify(report.verdict, null, 2));
console.log(`wrote ${path.join(outDir, "latest.json")}`);
