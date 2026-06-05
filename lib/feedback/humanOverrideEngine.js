/**
 * STEP 19-1 — HUMAN OVERRIDE ENGINE (v6.2)
 * 다수결 피드백보다 브랜드 품질·전환·체류 성과를 우선한다.
 */

const LOW_CONVERSION = 0.02;
const STRONG_CONVERSION = 0.06;
const LOW_DWELL_SEC = 25;
const STRONG_DWELL_SEC = 90;

/**
 * @param {{ insight_type?: string, payload?: object }} insight
 * @param {{
 *   tagRate?: number,
 *   conversionRate?: number,
 *   avgDwellSeconds?: number,
 *   sampleSize?: number,
 * }} metrics
 */
export function evaluateInsightAutoApply(insight = {}, metrics = {}) {
  const type = insight.insight_type || "";
  const sample = metrics.sampleSize ?? 0;
  const conversion = metrics.conversionRate ?? null;
  const dwell = metrics.avgDwellSeconds ?? null;
  const tagRate = metrics.tagRate ?? null;

  if (sample > 0 && sample < 8) {
    return { apply: false, reason: "sample_too_small", defer: true };
  }

  // 광고 톤 강화 요청이 많아도 전환·체류가 낮으면 보류
  if (type === "ad_tone_guard" && tagRate != null && tagRate < 0.2) {
    return { apply: true, reason: "clear_ad_tone_signal" };
  }

  if (conversion != null && conversion < LOW_CONVERSION && dwell != null && dwell < LOW_DWELL_SEC) {
    if (/negative_feedback|rewrite_vs_copy/.test(type)) {
      return { apply: true, reason: "quality_signal_with_weak_outcome" };
    }
    return {
      apply: false,
      reason: "human_override_weak_performance",
      defer: true,
      note: "피드백은 많지만 전환·체류가 낮아 자동 반영 보류",
    };
  }

  if (conversion != null && conversion >= STRONG_CONVERSION) {
    return { apply: true, reason: "strong_conversion_support" };
  }

  if (dwell != null && dwell >= STRONG_DWELL_SEC && /ai_cliche|rewrite/.test(type)) {
    return { apply: true, reason: "strong_dwell_support" };
  }

  return { apply: true, reason: "default_allow" };
}

/**
 * @param {object} aggregateContext
 */
export function summarizeHumanOverride(metrics = {}, decision = {}) {
  if (!decision.defer) return null;
  return (
    decision.note ||
    `Human Override — ${decision.reason} (전환 ${Math.round((metrics.conversionRate || 0) * 100)}%, 체류 ${Math.round(metrics.avgDwellSeconds || 0)}초)`
  );
}
