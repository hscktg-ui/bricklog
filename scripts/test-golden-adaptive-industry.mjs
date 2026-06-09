/**
 * 벤치마크 없는 업종 — DNA·LLM 원고 보존 회귀
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { assessGoldenQualityGate } from "../lib/golden/goldenQualityGate.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { resolveBriclogIndustryKey } from "../lib/product/industryContextEngine.js";
import { getGoldenSamplesForInput } from "../lib/golden/goldenDatasetStore.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PET_INPUT = {
  brandName: "멍냥마켓",
  region: "대전",
  topic: "강아지 간식 고르는 기준",
  mainKeyword: "강아지 간식",
  industry: "반려동물 용품",
  blogLengthTier: "medium",
};

assert.equal(resolveBriclogIndustryKey(PET_INPUT), "pet");
assert.equal(getGoldenSamplesForInput({ industry: "pet" }, 5).length, 0, "pet has no benchmark corpus");

const petPack = {
  title: "대전에서 강아지 간식 고르는 기준 — 멍냥마켓 이야기",
  sections: [
    {
      heading: "",
      body: `강아지 간식을 고를 때는 맛보다 급여 방식부터 떠올리게 됩니다.

닭가슴살 스틱·오리져키·연어 트릿·야채 큐브처럼 재료 표기가 분명한 제품이 선택하기 쉽습니다. 알레르기가 있는 경우 단백질 원료를 먼저 확인하는 편이 좋습니다.

대전에 위치한 멍냥마켓에서는 연령·체중별 급여 가이드를 함께 안내하고 있습니다.`,
    },
    {
      heading: "",
      body: `처음 급여할 때는 소량으로 시작하고, 변 상태와 기호도를 함께 봅니다.

간식은 하루 권장 칼로리의 10% 안쪽으로 맞추는 경우가 많고, 훈련용으로는 작은 크기의 트릿이 무난합니다. 보관은 직사광선을 피하고 개봉 후 기한을 확인해 두면 좋습니다.`,
    },
    {
      heading: "",
      body: `멍냥마켓은 매장에서 성분표와 원료를 직접 확인할 수 있어, 처음 방문하는 보호자도 비교하기 편합니다.

방문 전에 견종·체중·알레르기 이력을 정리해 두면 상담이 빨라집니다.`,
    },
  ],
  conclusion: "작은 간식도 급여 기준을 정리해 두면 일상이 편해집니다.",
  _meta: { llmGenerated: true, generationMode: "llm_openai" },
};

const beforeChars = getBlogFullText(petPack).replace(/\s/g, "").length;
const finalized = finalizeContentQualityForDelivery(petPack, PET_INPUT, "blog");
const afterChars = getBlogFullText(finalized).replace(/\s/g, "").length;

assert.ok(afterChars >= beforeChars * 0.85, `LLM pack shrunk ${beforeChars} -> ${afterChars}`);
assert.ok(!/카페는 메뉴보다/.test(getBlogFullText(finalized)), "must not inject cafe template");

const gate = assessGoldenQualityGate(finalized, PET_INPUT);
assert.ok(gate.checks?.compare?.sampleCount === 0);
assert.ok(!gate.reasons.includes("golden_benchmark_gap") || gate.score >= 80);

let llmParsed;
try {
  llmParsed = JSON.parse(readFileSync(join(root, "artifacts", "probe-tea-cafe", "llm-parsed.json"), "utf8"));
} catch {
  llmParsed = null;
}

if (llmParsed?.sections?.length) {
  const teaInput = {
    brandName: "다온티하우스",
    region: "경주",
    topic: "가을 시즌 티 메뉴",
    industry: "티카페",
    blogLengthTier: "medium",
  };
  const tea = {
    ...llmParsed,
    _meta: { llmGenerated: true, generationMode: "llm_openai" },
  };
  const teaOut = finalizeContentQualityForDelivery(tea, teaInput, "blog");
  const teaChars = getBlogFullText(teaOut).replace(/\s/g, "").length;
  assert.ok(teaChars >= 500, `tea llm preserved chars ${teaChars}`);
}

console.log("OK: golden-adaptive-industry", { petGate: gate.score, afterChars });
