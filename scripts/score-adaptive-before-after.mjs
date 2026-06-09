/**
 * 적응형 엔진 전후 점수 비교 (티카페 LLM · 반려동물 · 꽃집 회귀)
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { assessGoldenQualityGate } from "../lib/golden/goldenQualityGate.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getGoldenSamplesForInput } from "../lib/golden/goldenDatasetStore.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FLOWER = {
  brandName: "그랩앤고플라워",
  region: "파주",
  topic: "여름철 꽃 추천",
  mainKeyword: "꽃 추천",
  industry: "꽃집",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "파주 운정 24시간 무인 꽃집", source: "research" },
    { fact: "여름 시즌 리시안셔스·수국·해바라기", source: "research" },
  ],
  v2PreWriteVerified: true,
};

const PET = {
  brandName: "멍냥마켓",
  region: "대전",
  topic: "강아지 간식 고르는 기준",
  industry: "반려동물 용품",
  blogLengthTier: "medium",
};

const petPack = {
  title: "대전에서 강아지 간식 고르는 기준 — 멍냥마켓 이야기",
  sections: [
    {
      heading: "",
      body: `강아지 간식을 고를 때는 맛보다 급여 방식부터 떠올리게 됩니다.

닭가슴살 스틱·오리져키·연어 트릿·야채 큐브처럼 재료 표기가 분명한 제품이 선택하기 쉽습니다.

대전에 위치한 멍냥마켓에서는 연령·체중별 급여 가이드를 함께 안내하고 있습니다.`,
    },
    {
      heading: "",
      body: `처음 급여할 때는 소량으로 시작하고, 변 상태와 기호도를 함께 봅니다.

간식은 하루 권장 칼로리의 10% 안쪽으로 맞추는 경우가 많습니다.`,
    },
    {
      heading: "",
      body: `멍냥마켓은 매장에서 성분표와 원료를 직접 확인할 수 있어, 처음 방문하는 보호자도 비교하기 편합니다.`,
    },
  ],
  conclusion: "작은 간식도 급여 기준을 정리해 두면 일상이 편해집니다.",
  _meta: { llmGenerated: true, generationMode: "llm_openai" },
};

let teaPack;
try {
  teaPack = JSON.parse(readFileSync(join(root, "artifacts/probe-tea-cafe/llm-parsed.json"), "utf8"));
  teaPack._meta = { llmGenerated: true, generationMode: "llm_openai" };
} catch {
  teaPack = null;
}

function report(label, input, pack) {
  const before = getBlogFullText(pack).replace(/\s/g, "").length;
  const samples = getGoldenSamplesForInput(input, 5).length;
  const gateBefore = assessGoldenQualityGate(pack, input);
  const out = finalizeContentQualityForDelivery(pack, input, "blog");
  const after = getBlogFullText(out).replace(/\s/g, "").length;
  const gate = out._meta?.goldenGate || assessGoldenQualityGate(out, input);
  return {
    label,
    benchmarkSamples: samples,
    adaptiveMode: gate.checks?.adaptiveMode || gateBefore.checks?.adaptiveMode,
    charsBefore: before,
    charsAfter: after,
    charPreservePct: before ? Math.round((after / before) * 100) : 0,
    goldenBefore: gateBefore.score,
    goldenAfter: gate.score,
    goldenDelta: gate.score - gateBefore.score,
    haeshinAfter: gate.haeshin?.score,
    publishReady: out._meta?.publishReady === true,
    verdict: gate.verdict,
  };
}

const flowerPack = finalizeContentQualityForDelivery(
  buildMissionProseFallbackPack(FLOWER),
  FLOWER,
  "blog"
);

const rows = [
  report("반려동물 (코퍼스 0)", PET, petPack),
  teaPack ? report("티카페 LLM (코퍼스 3)", { ...PET, brandName: "다온티하우스", region: "경주", topic: "가을 티", industry: "티카페" }, teaPack) : null,
  {
    label: "꽃집 EQS (코퍼스 4+)",
    benchmarkSamples: getGoldenSamplesForInput(FLOWER, 5).length,
    goldenAfter: flowerPack._meta?.goldenGate?.score,
    haeshinAfter: flowerPack._meta?.goldenGate?.haeshin?.score,
    publishReady: flowerPack._meta?.publishReady === true,
    verdict: flowerPack._meta?.goldenGate?.verdict,
    charsAfter: getBlogFullText(flowerPack).replace(/\s/g, "").length,
  },
].filter(Boolean);

// 배포 전 기록값 (동일 시나리오 프로브)
const BEFORE = {
  "반려동물 (코퍼스 0)": { golden: null, charsAfter: null, publishReady: false },
  "티카페 LLM": { golden: 81, charsAfter: 343, publishReady: false, charsBefore: 903 },
  "꽃집 EQS": { golden: 90, publishReady: true },
};

console.log(JSON.stringify({ measured: rows, baseline: BEFORE }, null, 2));
