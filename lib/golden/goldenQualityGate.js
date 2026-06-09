/**
 * Golden Dataset Quality Gate — 해신기획 우수글 기준 최종 심사 SSOT
 * GPT 재학습 없음 · 생성 → Golden 비교 → 점수 → 재작성
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreGoldenAiSmell } from "@/lib/golden/goldenAiSmellEngine";
import { scoreGoldenIndustryFit } from "@/lib/golden/goldenIndustryFitEngine";
import { scoreGoldenBrandDna } from "@/lib/golden/goldenBrandDnaEngine";
import { compareToGoldenDataset } from "@/lib/golden/goldenCompareEngine";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";

export const GOLDEN_GATE_VERSION = "v1";
export const GOLDEN_PASS_SCORE = 90;
export const GOLDEN_REVISE_MIN = 80;

const WEIGHTS = {
  structure_score: 0.2,
  brand_score: 0.18,
  human_score: 0.18,
  intent_score: 0.14,
  repetition_score: 0.12,
  industry_score: 0.18,
};

function assessGoldenEditorialFastPass(pack, breakdown, checks) {
  if (!pack?._meta?.editorialQualityStandard && !pack?._meta?.editorialQualityReshape) {
    return null;
  }
  if (
    checks.aiSmell?.ok &&
    checks.industry?.ok &&
    breakdown.human_score >= 85 &&
    breakdown.repetition_score >= 85 &&
    breakdown.brand_score >= 50
  ) {
    const score = Math.max(
      GOLDEN_PASS_SCORE,
      Math.min(
        100,
        Math.round(
          breakdown.human_score * 0.35 +
            breakdown.industry_score * 0.2 +
            breakdown.brand_score * 0.2 +
            breakdown.structure_score * 0.15 +
            breakdown.repetition_score * 0.1
        )
      )
    );
    return {
      version: GOLDEN_GATE_VERSION,
      score,
      ok: true,
      verdict: "pass",
      shouldRegen: false,
      shouldRevise: false,
      minPass: GOLDEN_PASS_SCORE,
      reviseMin: GOLDEN_REVISE_MIN,
      breakdown,
      reasons: [],
      checks,
      editorialGoldenFastPass: true,
      userMessage: null,
    };
  }
  return null;
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {object[]} [goldenSamples]
 */
export function assessGoldenQualityGate(pack, input = {}, goldenSamples = null) {
  const full = getBlogFullText(pack);
  const industryKey = resolveGoldenIndustryKey(input);
  const samples = goldenSamples ?? getGoldenSamplesForInput(input, 5);

  const compare = compareToGoldenDataset(full, pack, input, samples);
  const brand = scoreGoldenBrandDna(full, input);
  const aiSmell = scoreGoldenAiSmell(full);
  const industry = scoreGoldenIndustryFit(full, input);

  const human_score = Math.round(compare.human_score * 0.7 + aiSmell.score * 0.3);

  const breakdown = {
    structure_score: compare.structure_score,
    brand_score: brand.score,
    human_score,
    intent_score: compare.intent_score,
    repetition_score: compare.repetition_score,
    industry_score: industry.score,
  };

  const checks = {
    compare,
    brand,
    aiSmell,
    industry,
    referenceSampleCount: samples.length,
    referenceTitles: compare.referenceTitles,
  };

  const editorialPass = assessGoldenEditorialFastPass(pack, breakdown, checks);
  if (editorialPass) {
    return {
      ...editorialPass,
      industryKey,
    };
  }

  let total = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    total += (breakdown[k] || 0) * w;
  }
  const score = Math.round(Math.max(0, Math.min(100, total)));

  const reasons = [];
  if (score < GOLDEN_PASS_SCORE) reasons.push("golden_score_below_pass");
  if (!brand.ok) reasons.push("brand_dna_weak");
  if (!industry.ok) reasons.push("golden_industry_mismatch");
  if (!aiSmell.ok) reasons.push("golden_ai_smell");
  if (compare.repetition_score < 80) reasons.push("golden_repetition_high");
  if (compare.intent_score < 65) reasons.push("golden_intent_low");

  let verdict = "pass";
  if (score < GOLDEN_REVISE_MIN) verdict = "fail";
  else if (score < GOLDEN_PASS_SCORE) verdict = "revise";

  return {
    version: GOLDEN_GATE_VERSION,
    score,
    ok: score >= GOLDEN_PASS_SCORE,
    verdict,
    shouldRegen: verdict === "fail",
    shouldRevise: verdict === "revise",
    minPass: GOLDEN_PASS_SCORE,
    reviseMin: GOLDEN_REVISE_MIN,
    industryKey,
    breakdown,
    reasons: [...new Set(reasons)],
    checks,
    userMessage:
      verdict === "pass"
        ? null
        : verdict === "revise"
          ? "우수글 기준에 근접했습니다. 일부 표현·정보를 다듬는 것을 권장합니다."
          : "해신기획 우수글 기준에 미달해 다시 작성합니다.",
  };
}

/** pack._meta.goldenGate 스탬프 */
export function stampGoldenQualityGate(pack, input = {}, goldenSamples = null) {
  const gate = assessGoldenQualityGate(pack, input, goldenSamples);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      goldenGate: gate,
      goldenGateScore: gate.score,
      goldenGateVerdict: gate.verdict,
    },
  };
}
