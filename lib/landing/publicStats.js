import fs from "fs";
import path from "path";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  computeSeedStats,
  dayKeyKst,
  formatStatDisplay,
} from "@/lib/landing/statsSeed";

const CACHE_PATH = path.join(process.cwd(), ".data", "public-stats-cache.json");

/** @type {{ hourKey: string | null, payload: object | null }} */
const memoryCache = { hourKey: null, payload: null };

function hourKey(now = new Date()) {
  const bucket = Math.floor(now.getTime() / (60 * 60 * 1000));
  return String(bucket);
}

export { dayKeyKst, formatStatDisplay, computeSeedStats };

function parseIntEnv(name, fallback) {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function kstBoundary(isoDateStr, endOfDay = false) {
  const suffix = endOfDay ? "T23:59:59.999+09:00" : "T00:00:00+09:00";
  return new Date(`${isoDateStr}${suffix}`).toISOString();
}

function kstNowParts(now = new Date()) {
  const kst = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  return {
    year: kst.getFullYear(),
    month: kst.getMonth(),
    date: kst.getDate(),
    day: kst.getDay(),
  };
}

function startOfWeekKstIso(now = new Date()) {
  const { year, month, date, day } = kstNowParts(now);
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(year, month, date - mondayOffset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return kstBoundary(`${y}-${m}-${d}`);
}

function startOfMonthKstIso(now = new Date()) {
  const { year, month } = kstNowParts(now);
  const m = String(month + 1).padStart(2, "0");
  return kstBoundary(`${year}-${m}-01`);
}

function buildMetrics({ weekPosts, monthBrands, totalUsers, monthPosts }) {
  return [
    {
      id: "weekPosts",
      label: "이번 주 제작된 글",
      value: weekPosts,
      display: formatStatDisplay(weekPosts),
    },
    {
      id: "monthBrands",
      label: "이번 달 이용 브랜드",
      value: monthBrands,
      display: formatStatDisplay(monthBrands),
    },
    {
      id: "totalUsers",
      label: "누적 이용자",
      value: totalUsers,
      display: formatStatDisplay(totalUsers),
    },
    {
      id: "monthPosts",
      label: "이번 달 제작된 글",
      value: monthPosts,
      display: formatStatDisplay(monthPosts),
    },
  ];
}

async function fetchLiveCounts(db) {
  const weekStart = startOfWeekKstIso();
  const monthStart = startOfMonthKstIso();

  const [
    weekPostsRes,
    monthPostsRes,
    profilesRes,
    brandsMonthRes,
    generationsRes,
  ] = await Promise.all([
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("content_items")
      .select("brand_id")
      .gte("created_at", monthStart)
      .not("brand_id", "is", null),
  ]);

  const brandIds = new Set(
    (brandsMonthRes.data || [])
      .map((r) => r.brand_id)
      .filter(Boolean)
  );

  return {
    weekPosts: weekPostsRes.error ? 0 : weekPostsRes.count ?? 0,
    monthPosts: monthPostsRes.error ? 0 : monthPostsRes.count ?? 0,
    monthBrands: brandsMonthRes.error ? 0 : brandIds.size,
    totalUsers: profilesRes.error ? 0 : profilesRes.count ?? 0,
  };
}

async function fetchTotalGenerations(db) {
  const { count, error } = await db
    .from("generations")
    .select("id", { count: "exact", head: true });
  return error ? 0 : count ?? 0;
}

export async function resolveStatsMode(db) {
  const forced = (process.env.BRICLOG_STATS_MODE ?? "seed").trim().toLowerCase();
  if (forced === "live") return db ? "live" : "seed";
  if (!db) return "seed";

  const threshold = parseIntEnv("BRICLOG_STATS_LIVE_THRESHOLD", 50);
  const totalGenerations = await fetchTotalGenerations(db);
  if (totalGenerations >= threshold) return "live";
  return "seed";
}

async function computeLiveStats(db) {
  const live = await fetchLiveCounts(db);
  const weekPosts = live.weekPosts;
  const monthBrands = live.monthBrands;
  const totalUsers = live.totalUsers;
  return {
    mode: "live",
    statsDateKst: dayKeyKst(),
    weekPosts,
    monthBrands,
    totalUsers,
    metrics: buildMetrics({
      weekPosts,
      monthBrands,
      totalUsers,
      monthPosts: live.monthPosts,
    }),
  };
}

function readFileCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeFileCache(payload) {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    /* Vercel 등 read-only FS — memory cache만 사용 */
  }
}

/**
 * Hourly public landing stats (seed or live). No PII — counts only.
 */
export async function getPublicLandingStats(now = new Date()) {
  const key = hourKey(now);

  if (memoryCache.hourKey === key && memoryCache.payload) {
    return memoryCache.payload;
  }

  const fileCached = readFileCache();
  const todayKst = dayKeyKst(now);
  if (
    fileCached?.hourKey === key &&
    fileCached?.stats &&
    fileCached.stats.statsDateKst === todayKst
  ) {
    memoryCache.hourKey = key;
    memoryCache.payload = fileCached.stats;
    return fileCached.stats;
  }

  const db = createServiceSupabase();
  const mode = await resolveStatsMode(db);
  const core =
    mode === "live" && db
      ? await computeLiveStats(db)
      : computeSeedStats(now);

  const stats = {
    ok: true,
    mode: core.mode,
    cachedAt: now.toISOString(),
    hourKey: key,
    statsDateKst: core.statsDateKst ?? dayKeyKst(now),
    metrics: core.metrics,
  };

  writeFileCache({ hourKey: key, stats, writtenAt: now.toISOString() });
  memoryCache.hourKey = key;
  memoryCache.payload = stats;

  return stats;
}
