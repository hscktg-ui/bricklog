import {
  countByDay,
  isoDaysAgo,
  lastNDayKeys,
  topCounts,
} from "@/lib/admin/dashboardMetrics";
import { SIGNUP_INTENT_PATH_PREFIX } from "@/lib/analytics/signupIntent";
import { isPublicTestQuotaTableReady } from "@/lib/publicTest/publicTestQuotaDb";
import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples";

const LANDING_DEMO_BRANDS = new Set(["모카하우스", "꽃담"]);

const CATALOG_DEMO_KEYS = new Set(
  PUBLIC_TEST_SAMPLES.map((s) => `${s.brandName}\0${s.topic}`)
);

function visitorKey(row = {}) {
  const sid = String(row.session_id || "").trim();
  if (sid) return `s:${sid}`;
  const ip = String(row.client_ip || "").trim();
  return ip ? `i:${ip}` : null;
}

/** @param {{ brand_name?: string, topic?: string }} row */
export function isLandingDemoPublicTestRun(row = {}) {
  const brand = String(row.brand_name || "").trim();
  return LANDING_DEMO_BRANDS.has(brand);
}

/** @param {{ brand_name?: string, topic?: string }} row */
export function isCatalogDemoPublicTestRun(row = {}) {
  const brand = String(row.brand_name || "").trim();
  const topic = String(row.topic || "").trim();
  return CATALOG_DEMO_KEYS.has(`${brand}\0${topic}`);
}

/** @param {{ brand_name?: string, topic?: string }} row */
export function isCustomPublicTestRun(row = {}) {
  return !isCatalogDemoPublicTestRun(row);
}

async function fetchAllSucceededRuns(db) {
  const all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await db
      .from("public_test_runs")
      .select(
        "id, run_date, client_ip, session_id, brand_name, region, topic, created_at"
      )
      .eq("succeeded", true)
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (error) return { rows: [], error };
    const batch = data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return { rows: all, error: null };
}

async function countPublicTestSignupCta(db) {
  const prefix = `${SIGNUP_INTENT_PATH_PREFIX}public_test`;
  const { count, error } = await db
    .from("site_visits")
    .select("id", { count: "exact", head: true })
    .like("path", `${prefix}%`);
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
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
    landingDemoRuns: 0,
    catalogDemoRuns: 0,
    customRuns: 0,
    runsToday: 0,
    runs7d: 0,
    runs30d: 0,
    runsPerDay7: [],
    runsPerDay30: [],
    topBrands: [],
    topTopics: [],
    topCustomTopics: [],
    recentSamples: [],
    signupCtaClicks: null,
    firstRunAt: null,
    lastRunAt: null,
    note: "성공한 샘플 생성만 집계합니다(게이트 실패·쿼터 초과 제외).",
  };

  if (!db) return empty;

  const tableReady = await isPublicTestQuotaTableReady();
  if (!tableReady) return { ...empty, tableReady: false };

  const [allPack, signupCtaPack] = await Promise.all([
    fetchAllSucceededRuns(db),
    countPublicTestSignupCta(db),
  ]);

  if (allPack.error) {
    return {
      ...empty,
      tableReady: true,
      loadError: allPack.error.message,
    };
  }

  const list = allPack.rows || [];
  const since30Iso = isoDaysAgo(30);
  const list30d = list.filter((r) => r.created_at >= since30Iso);

  const keys7 = lastNDayKeys(7);
  const keys30 = lastNDayKeys(30);
  const runsPerDay30 = countByDay(keys30, list30d, "created_at");
  const runsPerDay7 = runsPerDay30.filter((p) => keys7.includes(p.date));

  const todayKey = keys7[keys7.length - 1];
  const runsToday = runsPerDay30.find((p) => p.date === todayKey)?.count ?? 0;
  const runs7d = runsPerDay7.reduce((sum, p) => sum + p.count, 0);
  const runs30d = list30d.length;

  const allVisitors = new Set();
  let landingDemoRuns = 0;
  let catalogDemoRuns = 0;
  let customRuns = 0;
  for (const row of list) {
    const key = visitorKey(row);
    if (key) allVisitors.add(key);
    if (isLandingDemoPublicTestRun(row)) landingDemoRuns += 1;
    if (isCatalogDemoPublicTestRun(row)) catalogDemoRuns += 1;
    else customRuns += 1;
  }

  const topBrands = topCounts(list, (r) => r.brand_name, 8).map(({ key, count }) => ({
    label: key,
    count,
  }));

  const topTopics = topCounts(list, (r) => r.topic, 8).map(({ key, count }) => ({
    label: key,
    count,
  }));

  const customList = list.filter(isCustomPublicTestRun);
  const topCustomTopics = topCounts(customList, (r) => r.topic, 8).map(
    ({ key, count }) => ({ label: key, count })
  );

  const recentSamples = list.slice(0, 15).map((r) => ({
    at: r.created_at,
    brand: r.brand_name,
    region: r.region,
    topic: r.topic,
    isLandingDemo: isLandingDemoPublicTestRun(r),
    isCustom: isCustomPublicTestRun(r),
  }));

  const oldest = list.length ? list[list.length - 1] : null;

  return {
    tableReady: true,
    totalRuns: list.length,
    totalSampleUsers: allVisitors.size,
    landingDemoRuns,
    catalogDemoRuns,
    customRuns,
    landingDemoSharePct:
      list.length > 0 ? Math.round((landingDemoRuns / list.length) * 100) : 0,
    runsToday,
    runs7d,
    runs30d,
    runsPerDay7,
    runsPerDay30,
    topBrands,
    topTopics,
    topCustomTopics,
    recentSamples,
    signupCtaClicks: signupCtaPack.count,
    signupCtaError: signupCtaPack.error,
    firstRunAt: oldest?.created_at ?? null,
    lastRunAt: list[0]?.created_at ?? null,
    note: empty.note,
  };
}
