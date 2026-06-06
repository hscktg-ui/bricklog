import { createServiceSupabase } from "@/lib/supabase/server";
import { buildDashboardPayload, isoDaysAgo } from "@/lib/admin/dashboardMetrics";
import {
  loadLatestDbSnapshot,
  loadDevSnapshot,
} from "@/lib/cron/dailySnapshotStorage";
import { fetchDataAssetHealth } from "@/lib/dataAsset/adminHealth";
import { fetchPublicTestAdminStats } from "@/lib/publicTest/publicTestAdminStats";

const RANGE_DAYS = 30;
const MAX_ROWS = 8000;

export async function fetchAdminDashboardExtras({
  userCount = null,
  feedbackStats = null,
}) {
  const db = createServiceSupabase();
  if (!db) {
    return {
      dashboard: null,
      warning: "SUPABASE_SERVICE_ROLE_KEY 없음 — 대시보드 시계열 미로드",
    };
  }

  const sinceIso = isoDaysAgo(RANGE_DAYS);

  const [
    profilesRes,
    itemsRes,
    eventsRes,
    feedbackRes,
    subsRes,
    insightsRes,
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS),
    db
      .from("content_items")
      .select(
        "id, user_id, created_at, channel, persona, quality_score, prompt_input"
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    db
      .from("content_events")
      .select("user_id, created_at, meta")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    db.from("content_feedback").select("reaction"),
    db.from("user_subscriptions").select("plan"),
    db
      .from("global_quality_insights")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  let totalUsers = userCount;
  if (totalUsers == null) {
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true });
    totalUsers = count ?? 0;
  }

  const dashboard = buildDashboardPayload({
    profileRows: profilesRes.error ? [] : profilesRes.data || [],
    contentItemRows: itemsRes.error ? [] : itemsRes.data || [],
    eventRows: eventsRes.error ? [] : eventsRes.data || [],
    feedbackRows: feedbackRes.error ? [] : feedbackRes.data || [],
    subscriptionRows: subsRes.error ? [] : subsRes.data || [],
    userCount: totalUsers,
    pendingInsightsCount: insightsRes.error ? 0 : insightsRes.count ?? 0,
    feedbackStats,
  });

  let dailyCron = null;
  const latestDb = await loadLatestDbSnapshot(db);
  if (latestDb.row) {
    const m = latestDb.row.metrics || {};
    const u = m.usage || m;
    dailyCron = {
      snapshotDate: latestDb.row.snapshot_date,
      ranAt: latestDb.row.ran_at,
      signups: u.signups,
      contentItems: u.contentItems,
      avgQualityScore: u.avgQualityScore,
      brandsRecomputed: m.learning?.brandsRecomputed,
      insightsInserted: m.learning?.insightsInserted,
      source: "database",
    };
  } else {
    const dev = loadDevSnapshot();
    if (dev?.metrics) {
      const u = dev.metrics.usage || {};
      dailyCron = {
        snapshotDate: dev.metrics.snapshotDate,
        ranAt: dev.ranAt,
        signups: u.signups,
        contentItems: u.contentItems,
        avgQualityScore: u.avgQualityScore,
        brandsRecomputed: dev.learning?.brandsRecomputed,
        insightsInserted: dev.learning?.insightsInserted,
        source: "dev_file",
      };
    }
  }

  if (dailyCron) {
    dashboard.dailyCron = dailyCron;
  }

  const dataAssetHealth = await fetchDataAssetHealth(db);
  if (dataAssetHealth) {
    dashboard.dataAssetHealth = dataAssetHealth;
  }

  dashboard.publicBrandTest = await fetchPublicTestAdminStats(db);

  const warnings = [];
  if (profilesRes.error) warnings.push("profiles 시계열 조회 실패");
  if (itemsRes.error) warnings.push("content_items 시계열 조회 실패");
  if (eventsRes.error) warnings.push("content_events 체류 조회 실패");
  if (!dashboard.publicBrandTest.tableReady) {
    warnings.push(
      "public_test_runs 없음 — schema-v19-public-test.sql 적용 필요 (샘플 사용자 수 미집계)"
    );
  }

  return { dashboard, warnings };
}
