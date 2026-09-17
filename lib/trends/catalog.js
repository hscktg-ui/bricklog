import "server-only";

import { createServiceSupabase } from "@/lib/supabase/server";
import {
  TREND_CATEGORY_LABELS,
  TREND_SAMPLE_NOTE,
  TREND_SEED_ITEMS,
  TREND_STATUS_LABELS,
} from "@/lib/trends/seedCatalog";

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

function directionFromChange(change7d) {
  if (change7d >= 20) return "up";
  if (change7d <= -10) return "down";
  return "flat";
}

function normalizeTrendItem(item, index, mode) {
  const change7d = toNumber(item.change7d, 0);
  const change24h = toNumber(item.change24h, 0);
  const updatedAt = item.updatedAt || item.updated_at || new Date().toISOString();
  const relatedSlugs = asArray(item.relatedSlugs || item.related_slugs);

  return {
    id: item.id || `trend-${item.slug || index + 1}`,
    slug: String(item.slug || "").trim().toLowerCase(),
    name: String(item.name || "").trim(),
    description: String(item.description || "").trim(),
    category: String(item.category || "tools").trim().toLowerCase(),
    categoryLabel:
      TREND_CATEGORY_LABELS[String(item.category || "tools").trim().toLowerCase()] ||
      String(item.category || "tools").toUpperCase(),
    officialUrl: String(item.officialUrl || item.official_url || "").trim(),
    logoUrl: String(item.logoUrl || item.logo_url || "").trim(),
    trendScore: Math.max(0, Math.min(100, Math.round(toNumber(item.trendScore || item.trend_score, 0)))),
    change24h,
    change7d,
    status: String(item.status || "stable").trim().toLowerCase(),
    statusLabel:
      TREND_STATUS_LABELS[String(item.status || "stable").trim().toLowerCase()] || "STABLE",
    whyTrending: asArray(item.whyTrending || item.why_trending).slice(0, 3),
    whyItMatters: String(item.whyItMatters || item.why_it_matters || "").trim(),
    briclogView: String(item.briclogView || item.briclog_view || "").trim(),
    sourceSignals: Array.isArray(item.sourceSignals || item.source_signals)
      ? (item.sourceSignals || item.source_signals)
      : [],
    aliases: asArray(item.aliases),
    keywords: asArray(item.keywords),
    relatedSlugs,
    rank: index + 1,
    direction: directionFromChange(change7d),
    updatedAt,
    updatedLabel: formatUpdatedLabel(updatedAt),
    isSample: mode === "sample",
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
  return {
    mode: "sample",
    note: TREND_SAMPLE_NOTE,
    updatedAt: items[0]?.updatedAt || new Date().toISOString(),
    items,
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

  const { data, error } = await db
    .from("trend_items")
    .select(
      "id,slug,name,description,category,official_url,logo_url,trend_score,change_24h,change_7d,status,why_trending,why_it_matters,briclog_view,aliases,keywords,related_slugs,featured,is_hidden,updated_at"
    )
    .eq("is_hidden", false)
    .order("featured", { ascending: false })
    .order("trend_score", { ascending: false })
    .order("change_7d", { ascending: false });

  if (error) {
    if (isMissingTrendTable(error)) return null;
    throw error;
  }

  if (!data?.length) return null;

  const items = sortTrends(data.map((row, index) => normalizeTrendItem(row, index, "database"))).map(
    (item, index) => ({ ...item, rank: index + 1 })
  );

  return {
    mode: "database",
    note: "수집된 트렌드 테이블 기준",
    updatedAt: items[0]?.updatedAt || new Date().toISOString(),
    items,
  };
}

export async function getTrendCatalog() {
  try {
    const dbCatalog = await loadDbCatalog();
    return dbCatalog || buildSampleCatalog();
  } catch {
    return buildSampleCatalog();
  }
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
