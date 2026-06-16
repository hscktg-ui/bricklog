import { createServiceSupabase } from "@/lib/supabase/server";
import { isMissingFeedbackTable } from "@/lib/feedback/db";

const DEFAULT_LOOKBACK_DAYS = 14;

/**
 * 피드백·이벤트에서 Human Override·자동 승인 판단용 성과 지표
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [db]
 * @param {{ sinceDays?: number }} [options]
 */
export async function gatherInsightPerformanceMetrics(db = null, options = {}) {
  const client = db || createServiceSupabase();
  if (!client) {
    return {
      sampleSize: 0,
      conversionRate: null,
      avgDwellSeconds: null,
      tagRate: null,
    };
  }

  const sinceDays = options.sinceDays ?? DEFAULT_LOOKBACK_DAYS;
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const [fbRes, evRes] = await Promise.all([
    client
      .from("content_feedback")
      .select("reaction, tags")
      .gte("created_at", since.toISOString())
      .limit(2000),
    client
      .from("content_events")
      .select("event_type, channel, meta")
      .gte("created_at", since.toISOString())
      .limit(3000),
  ]);

  if (fbRes.error && isMissingFeedbackTable(fbRes.error)) {
    return {
      sampleSize: 0,
      conversionRate: null,
      avgDwellSeconds: null,
      tagRate: null,
    };
  }

  const tagCounts = {};
  let total = 0;
  for (const row of fbRes.data || []) {
    total += 1;
    for (const t of row.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const events = evRes.data || [];
  const copyEvents = events.filter((e) => /copy/.test(e.event_type)).length;
  const rewriteEvents = events.filter((e) => e.event_type === "rewrite").length;

  const dwellSamples = events
    .map((e) => Number(e.meta?.dwell_seconds || e.meta?.dwellSeconds || 0))
    .filter((n) => n > 0);
  const avgDwellSeconds = dwellSamples.length
    ? dwellSamples.reduce((a, b) => a + b, 0) / dwellSamples.length
    : null;
  const conversionRate =
    copyEvents + rewriteEvents > 0 ? copyEvents / (copyEvents + rewriteEvents) : null;

  return {
    sampleSize: total + events.length,
    conversionRate,
    avgDwellSeconds,
    tagRate: total ? (tagCounts.too_ad || 0) / total : null,
  };
}
