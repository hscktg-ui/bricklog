/**
 * 품질 신뢰도 KPI — 글 100개 중 90개 이상 사람이 읽을 수 있는 수준
 */
import { assessBriclogResetQualityGate, BRICLOG_RESET_PASS_SCORE } from "@/lib/product/briclogResetQualityGate";

export const QUALITY_TRUST_KPI_TARGET = 0.9;
export const QUALITY_TRUST_KPI_VERSION = "trust-kpi-v1";

/**
 * 사람이 읽을 수 있는 글 — reset 품질 게이트 SSOT (90점·hard fail 없음)
 * @param {object} pack
 * @param {object} input
 */
export function assessContentTrustReadable(pack, input = {}) {
  const reset = assessBriclogResetQualityGate(pack, input);
  const readable =
    !reset.hardFail &&
    !reset.shouldWithhold &&
    reset.score >= BRICLOG_RESET_PASS_SCORE;
  return {
    readable,
    score: reset.score,
    resetOk: reset.ok,
    hardFail: reset.hardFail,
    reasons: (reset.reasons || []).slice(0, 8),
  };
}

/**
 * @param {Array<{ pack: object, input: object, label?: string }>} cases
 */
export function measureQualityTrustKpi(cases = []) {
  const results = cases.map((c, i) => {
    const trust = assessContentTrustReadable(c.pack, c.input);
    return {
      index: i,
      label: c.label || `case-${i + 1}`,
      ...trust,
    };
  });
  const total = results.length;
  const readable = results.filter((r) => r.readable).length;
  const rate = total ? readable / total : 0;
  return {
    version: QUALITY_TRUST_KPI_VERSION,
    total,
    readable,
    rate,
    target: QUALITY_TRUST_KPI_TARGET,
    targetMet: rate >= QUALITY_TRUST_KPI_TARGET,
    results,
  };
}
