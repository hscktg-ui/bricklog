/**
 * 적응형 품질 정책 — 벤치마크 코퍼스 없어도 DNA·조사·LLM으로 송출
 */
import { GOLDEN_PASS_SCORE } from "@/lib/golden/goldenQualityGate";

export const ADAPTIVE_QUALITY_VERSION = "v1";

export function isSampleFreeGoldenGate(gate = {}) {
  return (
    gate?.breakdown?.sample_free === true ||
    gate?.checks?.referenceSampleCount === 0 ||
    gate?.checks?.compare?.sampleCount === 0
  );
}

/** 발행 가능 여부 — 코퍼스 없으면 해신 DNA 점수 우선 */
export function resolveGoldenPublishOk(goldenGate = {}) {
  if (!goldenGate || typeof goldenGate.score !== "number") return false;
  if (goldenGate.score >= GOLDEN_PASS_SCORE || goldenGate.verdict === "pass") return true;

  if (isSampleFreeGoldenGate(goldenGate)) {
    const haeshin = goldenGate.haeshin?.score ?? 0;
    const critical = goldenGate.haeshin?.checks?.failure?.criticalFail === true;
    if (!critical && haeshin >= GOLDEN_PASS_SCORE) return true;
    if (!critical && haeshin >= 88 && goldenGate.score >= 86) return true;
  }
  return false;
}

export function adaptiveQualityModeLabel(gate = {}) {
  return isSampleFreeGoldenGate(gate) ? "dna_adaptive" : "benchmark_assisted";
}

export function adaptiveQualityModeLabelKo(gate = {}) {
  return isSampleFreeGoldenGate(gate)
    ? "업종 DNA·조사 기반 적응형"
    : "벤치마크 참조 보강";
}
