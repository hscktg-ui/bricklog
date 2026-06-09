/**
 * Golden + Haeshin Quality Gate — 해신기획 우수글·DNA 기준 최종 심사 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { assessHaeshinQualityScore } from "@/lib/golden/haeshinQualityScorer";
import { compareToGoldenDataset } from "@/lib/golden/goldenCompareEngine";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";

export const GOLDEN_GATE_VERSION = "v2-haeshin";
export const GOLDEN_PASS_SCORE = 90;
export const GOLDEN_REVISE_MIN = 80;

/**
 * @param {object} pack
 * @param {object} input
 * @param {object[]} [goldenSamples]
 */
export function assessGoldenQualityGate(pack, input = {}, goldenSamples = null) {
  const full = getBlogFullText(pack);
  const industryKey = resolveGoldenIndustryKey(input);
  const samples = goldenSamples ?? getGoldenSamplesForInput(input, 5);
  const haeshin = assessHaeshinQualityScore(pack, input);
  const compare = compareToGoldenDataset(full, pack, input, samples);

  const goldenSimilarity = Math.round(
    compare.structure_score * 0.4 + compare.human_score * 0.35 + compare.repetition_score * 0.25
  );

  const score = Math.round(haeshin.score * 0.82 + goldenSimilarity * 0.18);

  const breakdown = {
    ...haeshin.components,
    golden_similarity: goldenSimilarity,
    structure_score: compare.structure_score,
    human_score: compare.human_score,
    repetition_score: compare.repetition_score,
  };

  const reasons = [...new Set([...haeshin.reasons, ...(score < GOLDEN_PASS_SCORE ? ["golden_benchmark_gap"] : [])])];

  let verdict = haeshin.verdict;
  if (score >= GOLDEN_PASS_SCORE) verdict = "pass";
  else if (score >= GOLDEN_REVISE_MIN) verdict = "revise";
  else verdict = "fail";

  return {
    version: GOLDEN_GATE_VERSION,
    score,
    ok: score >= GOLDEN_PASS_SCORE,
    verdict,
    shouldRegen: verdict === "fail",
    shouldRevise: verdict === "revise",
    shouldBlock: verdict === "fail",
    minPass: GOLDEN_PASS_SCORE,
    reviseMin: GOLDEN_REVISE_MIN,
    industryKey,
    breakdown,
    haeshin,
    reasons,
    checks: {
      haeshin: haeshin.checks,
      compare,
      referenceSampleCount: samples.length,
      referenceTitles: compare.referenceTitles,
    },
    userMessage:
      verdict === "pass"
        ? null
        : verdict === "revise"
          ? "해신기획 기준에 근접했습니다. Safe Edit로 일부 표현을 다듬는 것을 권장합니다."
          : "해신기획 품질 기준 미달 — 사용자에게 보이기 전 재작성합니다.",
  };
}

export function stampGoldenQualityGate(pack, input = {}, goldenSamples = null) {
  const gate = assessGoldenQualityGate(pack, input, goldenSamples);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      goldenGate: gate,
      goldenGateScore: gate.score,
      goldenGateVerdict: gate.verdict,
      haeshinScore: gate.haeshin?.score,
    },
  };
}
