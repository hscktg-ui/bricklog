import {
  countByDay,
  isoDaysAgo,
  lastNDayKeys,
  topCounts,
} from "@/lib/admin/dashboardMetrics";
import { isPublicTestQuotaTableReady } from "@/lib/publicTest/publicTestQuotaDb";

function visitorKey(row = {}) {
  const sid = String(row.session_id || "").trim();
  if (sid) return `s:${sid}`;
  const ip = String(row.client_ip || "").trim();
  return ip ? `i:${ip}` : null;
}

/**
 * 가입 전 브랜드 테스트 — admin 집계 (성공 run만 DB 기록)
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function fetchPublicTestAdminStats(db) {
  const empty = {
    tableReady: false,
    totalRuns: 0,
    totalSampleUsers: 0,
    runsToday: 0,
    runs7d: 0,
    runs30d: 0,
    runsPerDay7: [],
    runsPerDay30: [],
    topBrands: [],
    topTopics: [],
    lastRunAt: null,
  };

  if (!db) return empty;

  const tableReady = await isPublicTestQuotaTableReady();
  if (!tableReady) return { ...empty, tableReady: false };

  const since30Iso = isoDaysAgo(30);
  const { data: rows, error } = await db
    .from("public_test_runs")
    .select(
      "id, run_date, client_ip, session_id, brand_name, region, topic, created_at, succeeded"
    )
    .eq("succeeded", true)
    .gte("created_at", since30Iso)
    .order("created_at", { ascending: false })
    .limit(8000);

  if (error) {
    return { ...empty, tableReady: true, loadError: error.message };
  }

  const list = rows || [];
  const keys7 = lastNDayKeys(7);
  const keys30 = lastNDayKeys(30);
  const runsPerDay30 = countByDay(keys30, list, "created_at");
  const runsPerDay7 = runsPerDay30.filter((p) => keys7.includes(p.date));

  const todayKey = keys7[keys7.length - 1];
  const runsToday = runsPerDay30.find((p) => p.date === todayKey)?.count ?? 0;
  const runs7d = runsPerDay7.reduce((sum, p) => sum + p.count, 0);
  const runs30d = list.length;

  const { count: totalRuns, error: countErr } = await db
    .from("public_test_runs")
    .select("id", { count: "exact", head: true })
    .eq("succeeded", true);

  const allVisitors = new Set();
  const { data: visitorRows } = await db
    .from("public_test_runs")
    .select("client_ip, session_id")
    .eq("succeeded", true)
    .limit(12000);

  for (const row of visitorRows || []) {
    const key = visitorKey(row);
    if (key) allVisitors.add(key);
  }

  const topBrands = topCounts(
    list,
    (r) => r.brand_name,
    8
  ).map(({ key, count }) => ({ label: key, count }));

  const topTopics = topCounts(
    list,
    (r) => r.topic,
    8
  ).map(({ key, count }) => ({ label: key, count }));

  return {
    tableReady: true,
    totalRuns: countErr ? runs30d : totalRuns ?? runs30d,
    totalSampleUsers: allVisitors.size,
    runsToday,
    runs7d,
    runs30d,
    runsPerDay7,
    runsPerDay30,
    topBrands,
    topTopics,
    lastRunAt: list[0]?.created_at ?? null,
    note: "성공한 샘플 생성만 집계합니다(게이트 실패·쿼터 초과 제외).",
  };
}
