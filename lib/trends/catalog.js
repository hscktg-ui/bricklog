import { createServiceSupabase } from "@/lib/supabase/server";
import {
  TREND_CATEGORY_LABELS,
  TREND_SAMPLE_NOTE,
  TREND_SEED_ITEMS,
  TREND_STATUS_LABELS,
} from "@/lib/trends/seedCatalog";
import {
  buildCatalogSections,
  enrichCatalogRows,
  resolveFreshnessMeta,
} from "@/lib/trends/liveEngine";

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatUpdatedLabel(value) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function directionFromChange(change) {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function normalizeTrendItem(item, index, mode) {
  const change7d = toNumber(item.change7d, 0);
  const change24h = toNumber(item.change24h, 0);
  const isSample = mode === "sample";
  // SAMPLE 경로에서는 24h 변동을 1시간처럼 위장하지 않는다.
  const hourlyChange = isSample
    ? 0
    : toNumber(item.hourlyChange ?? item.hourly_change, Math.round(change24h / 4));
  const hourlyChangePercent = isSample
    ? 0
    : toNumber(item.hourlyChangePercent ?? item.hourly_change_percent, hourlyChange);
  const updatedAt = item.updatedAt || item.updated_at || new Date().toISOString();
  const relatedSlugs = asArray(item.relatedSlugs || item.related_slugs);
  const freshness = isSample
    ? {
        updatedAt,
        updatedLabel: formatUpdatedLabel(updatedAt),
        freshnessLabel: "예시(SAMPLE) 데이터",
        freshnessState: "sample",
        liveLabel: "SAMPLE",
        isLive: false,
      }
    : resolveFreshnessMeta(updatedAt);

  return {
    id: item.id || `trend-${item.slug || index + 1}`,
    slug: String(item.slug || "").trim().toLowerCase(),
    name: String(item.name || "").trim(),
    description: String(item.description || "").trim(),
    category: String(item.category || "tools").trim().toLowerCase(),
    categoryLabel:
      TREND_CATEGORY_LABELS[String(item.category || "tools").trim().toLowerCase()] ||
      "기타",
    officialUrl: String(item.officialUrl || item.official_url || "").trim(),
    logoUrl: String(item.logoUrl || item.logo_url || "").trim(),
    trendScore: Math.max(0, Math.min(100, Math.round(toNumber(item.trendScore || item.trend_score, 0)))),
    previousScore1h: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          toNumber(
            item.previousScore1h || item.previous_score_1h,
            (item.trendScore || item.trend_score || 0) - hourlyChange
          )
        )
      )
    ),
    hourlyChange,
    hourlyChangePercent,
    change24h,
    change7d,
    status: String(item.status || "stable").trim().toLowerCase(),
    statusLabel:
      TREND_STATUS_LABELS[String(item.status || "stable").trim().toLowerCase()] || "유지",
    whyTrending: asArray(item.whyTrending || item.why_trending).slice(0, 3),
    whyItMatters: String(item.whyItMatters || item.why_it_matters || "").trim(),
    briclogView: String(item.briclogView || item.briclog_view || "").trim(),
    sourceSignals: Array.isArray(item.sourceSignals || item.source_signals)
      ? (item.sourceSignals || item.source_signals)
      : [],
    aliases: asArray(item.aliases),
    keywords: asArray(item.keywords),
    relatedSlugs,
    currentRank: index + 1,
    previousRank: Math.max(1, index + 1 - Math.sign(hourlyChange || 0)),
    rankMovement: hourlyChange > 0 ? 1 : hourlyChange < 0 ? -1 : 0,
    direction: directionFromChange(hourlyChange),
    updatedAt: freshness.updatedAt,
    updatedLabel: freshness.updatedLabel || formatUpdatedLabel(updatedAt),
    freshnessLabel: freshness.freshnessLabel,
    freshnessState: freshness.freshnessState,
    liveLabel: freshness.liveLabel,
    isLive: freshness.isLive,
    isSample,
  };
}

function sortTrends(items) {
  return [...items].sort((a, b) => {
    if (b.trendScore !== a.trendScore) return b.trendScore - a.trendScore;
    return b.change7d - a.change7d;
  });
}

function buildSampleCatalog() {
  const items = sortTrends(TREND_SEED_ITEMS).map((item, index) =>
    normalizeTrendItem(item, index, "sample")
  );
  const { topItems, tickerItems, risingItems, newItems } = buildCatalogSections(items);
  const sampleUpdatedAt = items[0]?.updatedAt || new Date().toISOString();
  return {
    mode: "sample",
    note: TREND_SAMPLE_NOTE,
    updatedAt: sampleUpdatedAt,
    live: {
      updatedAt: sampleUpdatedAt,
      updatedLabel: formatUpdatedLabel(sampleUpdatedAt),
      freshnessLabel: "예시(SAMPLE) 데이터 — 실시간 변동 아님",
      freshnessState: "sample",
      liveLabel: "SAMPLE",
      isLive: false,
    },
    items,
    topItems,
    tickerItems: [],
    risingItems: [],
    newItems: [],
  };
}

function isMissingTrendTable(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "42P01" || code === "PGRST205" || /trend_items/i.test(msg);
}

async function loadDbCatalog() {
  const db = createServiceSupabase();
  if (!db) return null;

  const [{ data, error }, { data: latestJob }] = await Promise.all([
    db
      .from("trend_items")
      .select(
        "id,slug,name,description,category,official_url,logo_url,trend_score,previous_score_1h,hourly_change,hourly_change_percent,current_rank,previous_rank,rank_movement,change_24h,change_7d,status,why_trending,why_it_matters,briclog_view,aliases,keywords,related_slugs,featured,is_hidden,last_snapshot_at,updated_at"
      )
      .eq("is_hidden", false)
      .order("current_rank", { ascending: true, nullsFirst: false })
      .order("trend_score", { ascending: false }),
    db
      .from("trend_job_runs")
      .select("finished_at,status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) {
    if (isMissingTrendTable(error)) return null;
    throw error;
  }

  if (!data?.length) return null;

  const items = enrichCatalogRows(data);
  const { topItems, tickerItems, risingItems, newItems } = buildCatalogSections(items);
  const live = resolveFreshnessMeta(latestJob?.finished_at || items[0]?.updatedAt || new Date().toISOString());

  return {
    mode: "database",
    note: "매시간 수집된 트렌드 테이블 기준",
    updatedAt: live.updatedAt || items[0]?.updatedAt || new Date().toISOString(),
    live,
    items,
    topItems,
    tickerItems,
    risingItems,
    newItems,
  };
}

/** Home ISR + concurrent catalog reads — short process cache */
const TREND_CATALOG_TTL_MS = 60_000;
/** @type {{ at: number, value: any } | null} */
let trendCatalogCache = null;
/** @type {Promise<any> | null} */
let trendCatalogInflight = null;

export async function getTrendCatalog() {
  const now = Date.now();
  if (trendCatalogCache && now - trendCatalogCache.at < TREND_CATALOG_TTL_MS) {
    return trendCatalogCache.value;
  }
  if (trendCatalogInflight) return trendCatalogInflight;

  trendCatalogInflight = (async () => {
    try {
      const dbCatalog = await loadDbCatalog();
      const value = dbCatalog || buildSampleCatalog();
      trendCatalogCache = { at: Date.now(), value };
      return value;
    } catch {
      const value = buildSampleCatalog();
      trendCatalogCache = { at: Date.now(), value };
      return value;
    } finally {
      trendCatalogInflight = null;
    }
  })();

  return trendCatalogInflight;
}

export async function getTrendBySlug(slug) {
  const catalog = await getTrendCatalog();
  return catalog.items.find((item) => item.slug === slug) || null;
}

export async function getTrendRelatedItems(slug, limit = 3) {
  const catalog = await getTrendCatalog();
  const current = catalog.items.find((item) => item.slug === slug);
  if (!current) return [];

  const prioritized = current.relatedSlugs
    .map((relatedSlug) => catalog.items.find((item) => item.slug === relatedSlug))
    .filter(Boolean);

  const fallback = catalog.items.filter(
    (item) =>
      item.slug !== slug &&
      item.category === current.category &&
      !prioritized.some((picked) => picked.slug === item.slug)
  );

  return [...prioritized, ...fallback].slice(0, limit);
}

export function buildTrendCreateHref(trendName) {
  const q = new URLSearchParams({
    create: "blog",
    topic: trendName,
    trendContext: trendName,
  });
  return `/?${q.toString()}#public-brand-test`;
}
