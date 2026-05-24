import { isoDaysAgo } from "@/lib/admin/dashboardMetrics";

const RANGE_DAYS = 30;

/**
 * 관리자용 데이터 자산 건강 지표 (집계만, 원문 없음)
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function fetchDataAssetHealth(db) {
  if (!db) return null;

  const sinceIso = isoDaysAgo(RANGE_DAYS);

  const [
    learningRes,
    feedbackRes,
    snapshotsRes,
    registryRes,
    brandsWithAssetsRes,
  ] = await Promise.all([
    db
      .from("brand_learning_profiles")
      .select("id", { count: "exact", head: true }),
    db
      .from("content_feedback")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso),
    db
      .from("daily_usage_snapshots")
      .select("id, snapshot_date, ran_at")
      .order("ran_at", { ascending: false })
      .limit(14),
    db
      .from("data_asset_registry")
      .select("asset_type")
      .gte("created_at", sinceIso)
      .limit(5000),
    db
      .from("brands")
      .select("id, brand_data_assets")
      .not("brand_data_assets", "eq", "{}")
      .limit(2000),
  ]);

  const registryRows = registryRes.error ? [] : registryRes.data || [];
  const registryByType = {};
  for (const r of registryRows) {
    const t = r.asset_type || "unknown";
    registryByType[t] = (registryByType[t] || 0) + 1;
  }

  const brandRows = brandsWithAssetsRes.error ? [] : brandsWithAssetsRes.data || [];
  let brandsWithGenerations = 0;
  let totalGenerationsTracked = 0;
  for (const b of brandRows) {
    const a = b.brand_data_assets || {};
    if (a.generationCount > 0) brandsWithGenerations += 1;
    totalGenerationsTracked += a.generationCount || 0;
  }

  const snapshots = snapshotsRes.error ? [] : snapshotsRes.data || [];

  return {
    brandsWithLearningProfiles: learningRes.error ? null : learningRes.count ?? 0,
    feedbackLast30d: feedbackRes.error ? null : feedbackRes.count ?? 0,
    brandsWithAssetRollup: brandRows.length,
    brandsWithGenerations,
    totalGenerationsTracked,
    registryEventsLast30d: registryRows.length,
    registryByType,
    snapshotGrowth: snapshots.map((s) => ({
      date: s.snapshot_date,
      ranAt: s.ran_at,
    })),
    tablesReady: {
      learning: !learningRes.error,
      feedback: !feedbackRes.error,
      snapshots: !snapshotsRes.error,
      registry: !registryRes.error,
      brandRollup: !brandsWithAssetsRes.error,
    },
  };
}
