import { createServiceSupabase } from "@/lib/supabase/server";
import { aggregateGlobalInsightCandidates } from "@/lib/feedback/globalInsights";
import { recomputeBrandLearningProfile } from "@/lib/feedback/brandLearningProfile";
import { aggregateDailyUsageMetrics } from "@/lib/cron/aggregateDailyUsage";
import {
  kstYesterdayDateString,
  kstDayRangeIso,
} from "@/lib/cron/kstDate";
import {
  loadDbSnapshot,
  saveDbSnapshot,
  saveDevSnapshot,
} from "@/lib/cron/dailySnapshotStorage";
import { writeDailyRunSummaryDoc } from "@/lib/cron/writeDailyRunSummary";
import { compoundDataAssetsNightly } from "@/lib/dataAsset/compoundAssets";

const ACTIVE_BRAND_DAYS = 7;
const MAX_BRAND_RECOMPUTE = 80;
const ROW_LIMIT = 12000;

/**
 * @param {{ snapshotDate?: string, force?: boolean }} [options]
 */
export async function runDailyDevelopPipeline(options = {}) {
  const db = createServiceSupabase();
  if (!db) {
    return { ok: false, error: "no_service_role", status: 503 };
  }

  const snapshotDate = options.snapshotDate || kstYesterdayDateString();
  const { startIso, endIso } = kstDayRangeIso(snapshotDate);
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - ACTIVE_BRAND_DAYS);

  if (!options.force) {
    const existing = await loadDbSnapshot(db, snapshotDate);
    if (existing.row) {
      const metrics = existing.row.metrics || {};
      const learning = metrics.learning || {};
      const ranAt = existing.row.ran_at;
      writeDailyRunSummaryDoc({
        metrics: { ...metrics, snapshotDate },
        learning,
        ranAt,
        idempotent: true,
      });
      return {
        ok: true,
        idempotent: true,
        snapshotDate,
        ranAt,
        metrics,
        learning,
      };
    }
  }

  const [
    profilesRes,
    itemsRes,
    eventsRes,
    feedbackRes,
    perfRes,
    subsRes,
    activeBrandsRes,
  ] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id, created_at, nickname, contact_phone, profile_completed_at, primary_use_case"
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_items")
      .select(
        "id, user_id, brand_id, created_at, channel, persona, quality_score, prompt_input"
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_events")
      .select("id, user_id, brand_id, event_type, channel, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_feedback")
      .select("reaction, tags, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_performance")
      .select("id, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db.from("user_subscriptions").select("plan"),
    db
      .from("content_events")
      .select("user_id, brand_id")
      .gte("created_at", since7d.toISOString())
      .not("brand_id", "is", null)
      .limit(ROW_LIMIT),
  ]);

  const metrics = aggregateDailyUsageMetrics({
    snapshotDate,
    startIso,
    endIso,
    profiles: profilesRes.data || [],
    contentItems: itemsRes.data || [],
    contentEvents: eventsRes.data || [],
    contentFeedback: feedbackRes.data || [],
    contentPerformance: perfRes.data || [],
    subscriptions: subsRes.data || [],
  });

  const brandPairs = new Map();
  for (const row of activeBrandsRes.data || []) {
    if (!row.brand_id || !row.user_id) continue;
    brandPairs.set(row.brand_id, row.user_id);
  }
  const pairs = [...brandPairs.entries()].slice(0, MAX_BRAND_RECOMPUTE);

  let brandsRecomputed = 0;
  let brandsSkipped = 0;
  for (const [brandId, userId] of pairs) {
    try {
      const result = await recomputeBrandLearningProfile(db, userId, brandId);
      if (result) brandsRecomputed += 1;
      else brandsSkipped += 1;
    } catch {
      brandsSkipped += 1;
    }
  }

  const insightResult = await aggregateGlobalInsightCandidates();

  const compoundResult = await compoundDataAssetsNightly(db, pairs);

  const learning = {
    brandsRecomputed,
    brandsSkipped,
    brandsEligible: brandPairs.size,
    insightsInserted: insightResult.inserted ?? 0,
    insightsSuggested: insightResult.suggestions ?? 0,
    insightsOk: insightResult.ok ?? false,
    dataAssets: compoundResult?.skipped
      ? null
      : {
          rollupsUpdated: compoundResult?.rollupsUpdated ?? 0,
          learningRecomputed: compoundResult?.learningRecomputed ?? 0,
          userProfilesRecomputed: compoundResult?.userProfilesRecomputed ?? 0,
        },
  };

  const ranAt = new Date().toISOString();
  const snapshot = { metrics, learning, ranAt, idempotent: false };

  const dbSave = await saveDbSnapshot(db, snapshot);
  if (!dbSave.ok && dbSave.missingTable) {
    saveDevSnapshot(snapshot);
  } else if (dbSave.ok) {
    saveDevSnapshot(snapshot);
  }

  writeDailyRunSummaryDoc({ metrics, learning, ranAt, idempotent: false });

  return {
    ok: true,
    idempotent: false,
    snapshotDate,
    ranAt,
    metrics,
    learning,
    persistedToDb: dbSave.ok === true,
  };
}
