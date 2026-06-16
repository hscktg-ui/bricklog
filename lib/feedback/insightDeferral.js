import { summarizeHumanOverride } from "@/lib/feedback/humanOverrideEngine";

/**
 * 자동 승인 보류 사유를 pending 인사이트 payload에 기록 (야간 재시도용)
 */
export async function recordInsightDeferral(db, row, decision = {}, metrics = {}) {
  if (!db || !row?.id) return { ok: false };

  const prev = row.payload?.autoDefer || {};
  const deferCount = (prev.deferCount || 0) + 1;
  const note = summarizeHumanOverride(metrics, decision);

  const payload = {
    ...(row.payload || {}),
    autoDefer: {
      reason: decision.reason || "deferred",
      defer: decision.defer === true,
      deferCount,
      lastAt: new Date().toISOString(),
      note: note || decision.note || null,
      metricsSnapshot: {
        sampleSize: metrics.sampleSize ?? null,
        conversionRate: metrics.conversionRate ?? null,
        avgDwellSeconds: metrics.avgDwellSeconds ?? null,
      },
    },
  };

  const { error } = await db
    .from("global_quality_insights")
    .update({ payload })
    .eq("id", row.id)
    .eq("status", "pending");

  if (error) return { ok: false, reason: error.message };
  return { ok: true, deferCount };
}
