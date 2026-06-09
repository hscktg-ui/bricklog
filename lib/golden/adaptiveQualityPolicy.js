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
export function resolveGoldenPublishOk(goldenGate = {}, pack = {}) {
  if (!goldenGate || typeof goldenGate.score !== "number") return false;
  if (goldenGate.score >= GOLDEN_PASS_SCORE || goldenGate.verdict === "pass") return true;

  const haeshin = goldenGate.haeshin?.score ?? 0;
  const critical = goldenGate.haeshin?.checks?.failure?.criticalFail === true;
  const llmPolished = pack?._meta?.llmDeliveryPolish === true;

  if (isSampleFreeGoldenGate(goldenGate)) {
    if (!critical && haeshin >= GOLDEN_PASS_SCORE) return true;
    if (!critical && haeshin >= 88 && goldenGate.score >= 86) return true;
    if (!critical && llmPolished && haeshin >= 86 && goldenGate.score >= 84) return true;
  }

  if (llmPolished && !critical && haeshin >= 88 && goldenGate.score >= 87) {
    return true;
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

function isLlmAdaptiveDeliveryPack(pack = {}) {
  return (
    pack?._meta?.llmDeliveryPolish === true || pack?._meta?.llmDeliveryLightPath === true
  );
}

/** LLM 원고 — 해신·골든 적응 통과 시 SQV·contentGate 길이 제한 완화 */
export function resolveLlmAdaptivePublishReady(pack = {}, { goldenGate, contentGate } = {}) {
  if (!isLlmAdaptiveDeliveryPack(pack)) return false;
  if (!resolveGoldenPublishOk(goldenGate, pack)) return false;

  const haeshin = goldenGate?.haeshin?.score ?? 0;
  const checks = goldenGate?.haeshin?.checks || {};
  if (checks.failure?.criticalFail) return false;
  if (checks.placeholder?.literal) return false;
  if (checks.industry?.ok === false) return false;
  if (haeshin < 86) return false;

  const placeholderHits = contentGate?.checks?.placeholder?.total ?? 0;
  if (placeholderHits > 2) return false;

  return true;
}
