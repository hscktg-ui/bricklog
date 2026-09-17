import { createServiceSupabase } from "@/lib/supabase/server";
import {
  TREND_CATEGORY_LABELS,
  TREND_SEED_ITEMS,
  TREND_STATUS_LABELS,
} from "@/lib/trends/seedCatalog";
import {
  LIVE_TREND_DELAY_MINUTES,
  LIVE_TREND_NEW_LIMIT,
  LIVE_TREND_RISING_LIMIT,
  LIVE_TREND_SCORE_WEIGHTS,
  LIVE_TREND_STALE_MINUTES,
  LIVE_TREND_STATUS_THRESHOLDS,
  LIVE_TREND_TICKER_LIMIT,
  LIVE_TREND_TOP_LIMIT,
} from "@/lib/trends/liveConfig";
import { collectLiveSourceBundle } from "@/lib/trends/liveCollectors";

const SEED_BY_SLUG = Object.fromEntries(TREND_SEED_ITEMS.map((item) => [item.slug, item]));

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function floorToUtcHour(value = new Date()) {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

export function nextUtcHour(value = new Date()) {
  const date = floorToUtcHour(value);
  date.setUTCHours(date.getUTCHours() + 1);
  return date;
}

export function formatUpdatedLabel(value, locale = "ko-KR") {
  try {
    return new Intl.DateTimeFormat(locale, {
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

export function formatHourlyLabel(value, locale = "ko-KR") {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function resolveFreshnessMeta(updatedAt, now = new Date()) {
  if (!updatedAt) {
    return {
      updatedAt: null,
      updatedLabel: "",
      freshnessMinutes: null,
      freshnessLabel: "업데이트 없음",
      freshnessState: "missing",
      liveLabel: "DATA DELAYED",
      isLive: false,
    };
  }
  const diffMinutes = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(updatedAt).getTime()) / 60000)
  );
  if (diffMinutes >= LIVE_TREND_DELAY_MINUTES) {
    return {
      updatedAt,
      updatedLabel: formatUpdatedLabel(updatedAt),
      freshnessMinutes: diffMinutes,
      freshnessLabel: `Last updated ${diffMinutes} min ago`,
      freshnessState: "delayed",
      liveLabel: "DATA DELAYED",
      isLive: false,
    };
  }
  if (diffMinutes >= LIVE_TREND_STALE_MINUTES) {
    return {
      updatedAt,
      updatedLabel: formatUpdatedLabel(updatedAt),
      freshnessMinutes: diffMinutes,
      freshnessLabel: `Last updated ${diffMinutes} min ago`,
      freshnessState: "stale",
      liveLabel: `UPDATED ${diffMinutes} MIN AGO`,
      isLive: false,
    };
  }
  return {
    updatedAt,
    updatedLabel: formatUpdatedLabel(updatedAt),
    freshnessMinutes: diffMinutes,
    freshnessLabel: `Last updated ${diffMinutes} min ago`,
    freshnessState: "fresh",
    liveLabel: `UPDATED ${formatHourlyLabel(updatedAt)}`,
    isLive: true,
  };
}

export function directionFromValue(value) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

export function shouldRegenerateSummary({
  previousItem = null,
  nextScore = 0,
  hourlyChange = 0,
  majorSourceCount = 0,
  force = false,
  now = new Date(),
}) {
  if (force) return { regenerate: true, reasons: ["manual"] };

  const reasons = [];
  if (Math.abs(hourlyChange) >= LIVE_TREND_STATUS_THRESHOLDS.summaryRegenerationDelta) {
    reasons.push("score_delta");
  }
  if (majorSourceCount >= 2) {
    reasons.push("major_source");
  }
  if (previousItem?.status === "new" && nextScore >= LIVE_TREND_STATUS_THRESHOLDS.hotScore) {
    reasons.push("new_to_hot");
  }

  const lastGeneratedAt =
    previousItem?.summary_cache?.generatedAt ||
    previousItem?.summary_cache?.checkedAt ||
    previousItem?.updated_at;
  if (lastGeneratedAt) {
    const hoursSince = (new Date(now).getTime() - new Date(lastGeneratedAt).getTime()) / 3600000;
    if (hoursSince >= LIVE_TREND_STATUS_THRESHOLDS.summaryMaxAgeHours) {
      reasons.push("summary_ttl");
    }
  } else {
    reasons.push("missing_summary");
  }

  return { regenerate: reasons.length > 0, reasons };
}

export function deriveTrendStatus({
  score = 0,
  hourlyChange = 0,
  firstSeenAt = null,
  now = new Date(),
}) {
  const firstSeenMs = firstSeenAt ? new Date(firstSeenAt).getTime() : null;
  const ageHours =
    firstSeenMs != null ? (new Date(now).getTime() - firstSeenMs) / 3600000 : Infinity;

  if (ageHours <= LIVE_TREND_STATUS_THRESHOLDS.newWindowHours) return "new";
  if (
    score >= LIVE_TREND_STATUS_THRESHOLDS.hotScore &&
    hourlyChange >= LIVE_TREND_STATUS_THRESHOLDS.hotHourlyChange
  ) {
    return "hot";
  }
  if (hourlyChange >= LIVE_TREND_STATUS_THRESHOLDS.risingHourlyChange) return "rising";
  if (hourlyChange <= LIVE_TREND_STATUS_THRESHOLDS.fallingHourlyChange) return "falling";
  return "stable";
}

function buildWhyTrendingLines(item, totals = {}, status = "stable") {
  const lines = [];
  if (totals.officialMomentum > 0) {
    lines.push(`공식 발표 흐름에서 ${item.name} 관련 신호가 다시 포착됐습니다.`);
  }
  if (totals.modelActivity > 0) {
    lines.push(`모델·허브 활동에서 ${item.name} 관련 움직임이 확인됩니다.`);
  }
  if (totals.developerMomentum > 0) {
    lines.push(`개발자 생태계에서 ${item.name} 관련 반응이 늘고 있습니다.`);
  }
  if (totals.mediaMomentum > 0) {
    lines.push(`뉴스·미디어 피드에서 ${item.name} 언급이 이어지고 있습니다.`);
  }
  if (totals.communityMomentum > 0) {
    lines.push(`커뮤니티 레이어에서 ${item.name} 관련 반응이 감지됩니다.`);
  }
  if (lines.length < 3 && status === "new") {
    lines.push(`${item.name}가 최근 감지 리스트에 새로 진입했습니다.`);
  }
  if (!lines.length) {
    return item.why_trending || item.whyTrending || [];
  }
  return lines.slice(0, 3);
}

function buildSummaryCache(previousItem, summaryDecision, sourceSignals, recordedAt) {
  return {
    ...(previousItem?.summary_cache || {}),
    checkedAt: recordedAt,
    needsRefresh: summaryDecision.regenerate,
    reasons: summaryDecision.reasons,
    signalCount: sourceSignals.length,
  };
}

function seedToDbRecord(seed) {
  const updatedAt = seed.updatedAt || new Date().toISOString();
  const firstSeenAt =
    seed.status === "new"
      ? updatedAt
      : new Date(new Date(updatedAt).getTime() - 7 * 24 * 3600000).toISOString();
  return {
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    official_url: seed.officialUrl || "",
    logo_url: seed.logoUrl || "",
    trend_score: seed.trendScore || 0,
    change_24h: seed.change24h || 0,
    change_7d: seed.change7d || 0,
    status: seed.status || "stable",
    why_trending: seed.whyTrending || [],
    why_it_matters: seed.whyItMatters || "",
    briclog_view: seed.briclogView || "",
    aliases: seed.aliases || [],
    keywords: seed.keywords || [],
    related_slugs: seed.relatedSlugs || [],
    source_config: seed.sourceConfig || {},
    summary_cache: {},
    featured: true,
    first_seen_at: firstSeenAt,
    last_seen_at: updatedAt,
    last_snapshot_at: updatedAt,
  };
}

async function ensureSeedTrendItems(db) {
  const rows = TREND_SEED_ITEMS.map(seedToDbRecord);
  const { error } = await db.from("trend_items").upsert(rows, {
    onConflict: "slug",
  });
  if (error) throw error;
}

async function loadTrendRows(db) {
  const { data, error } = await db
    .from("trend_items")
    .select("*")
    .eq("is_hidden", false)
    .order("featured", { ascending: false })
    .order("current_rank", { ascending: true, nullsFirst: false })
    .order("trend_score", { ascending: false });
  if (error) throw error;
  return data || [];
}

function buildJobKey(bucketStartedAt, force = false) {
  const base = `hourly:${new Date(bucketStartedAt).toISOString()}`;
  return force ? `${base}:force:${Date.now()}` : base;
}

async function createJobRun(db, bucketStartedAt, trigger, force) {
  const jobKey = buildJobKey(bucketStartedAt, force);
  const { data, error } = await db
    .from("trend_job_runs")
    .insert({
      job_key: jobKey,
      job_type: "hourly",
      trigger,
      status: "running",
      bucket_started_at: new Date(bucketStartedAt).toISOString(),
    })
    .select("id,job_key")
    .single();

  if (!error) return { data, duplicate: false };

  const msg = String(error.message || "");
  const code = String(error.code || "");
  if (!force && (code === "23505" || /duplicate|unique/i.test(msg))) {
    const { data: existing } = await db
      .from("trend_job_runs")
      .select("*")
      .eq("job_key", jobKey)
      .maybeSingle();
    return { data: existing, duplicate: true };
  }
  throw error;
}

async function finishJobRun(db, id, patch) {
  if (!id) return;
  await db.from("trend_job_runs").update(patch).eq("id", id);
}

async function loadSnapshotHistory(db, recordedAt) {
  const since7d = new Date(new Date(recordedAt).getTime() - 7 * 24 * 3600000).toISOString();
  const { data, error } = await db
    .from("trend_snapshots")
    .select("trend_id,score,rank,recorded_at")
    .gte("recorded_at", since7d)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  const byTrend = new Map();
  for (const row of data || []) {
    const bucket = byTrend.get(row.trend_id) || [];
    bucket.push(row);
    byTrend.set(row.trend_id, bucket);
  }
  return byTrend;
}

function pickClosestSnapshot(rows = [], targetMs) {
  return rows.find((row) => new Date(row.recorded_at).getTime() <= targetMs) || null;
}

function aggregateSignals(trendRows, signals) {
  const bySlug = new Map();
  for (const row of trendRows) {
    bySlug.set(row.slug, {
      totals: {
        searchMomentum: 0,
        communityMomentum: 0,
        developerMomentum: 0,
        modelActivity: 0,
        mediaMomentum: 0,
        officialMomentum: 0,
        recency: 0,
      },
      sourceSignals: [],
    });
  }

  for (const signal of signals) {
    const bucket = bySlug.get(signal.trendSlug);
    if (!bucket) continue;
    bucket.sourceSignals.push(signal);
    bucket.totals[signal.metric] =
      toNumber(bucket.totals[signal.metric]) + toNumber(signal.value);
    bucket.totals.recency += 1;
  }

  return bySlug;
}

export function computeTrendRows({
  trendRows,
  signals,
  historyByTrend = new Map(),
  recordedAt = new Date().toISOString(),
}) {
  const aggregated = aggregateSignals(trendRows, signals);
  const scored = trendRows.map((row) => {
    const bucket = aggregated.get(row.slug) || { totals: {}, sourceSignals: [] };
    const totals = bucket.totals || {};
    const liveRaw =
      toNumber(totals.searchMomentum) * LIVE_TREND_SCORE_WEIGHTS.searchMomentum +
      toNumber(totals.communityMomentum) * LIVE_TREND_SCORE_WEIGHTS.communityMomentum +
      toNumber(totals.developerMomentum) * LIVE_TREND_SCORE_WEIGHTS.developerMomentum +
      toNumber(totals.modelActivity) * LIVE_TREND_SCORE_WEIGHTS.modelActivity +
      toNumber(totals.mediaMomentum) * LIVE_TREND_SCORE_WEIGHTS.mediaMomentum +
      toNumber(totals.officialMomentum) * LIVE_TREND_SCORE_WEIGHTS.officialMomentum +
      toNumber(totals.recency) * LIVE_TREND_SCORE_WEIGHTS.recency;
    const seedBaseline = toNumber(SEED_BY_SLUG[row.slug]?.trendScore, toNumber(row.trend_score, 0)) / 100;
    return {
      row,
      liveRaw,
      baselineRaw: seedBaseline,
      totals,
      sourceSignals: bucket.sourceSignals || [],
    };
  });

  const maxRaw = Math.max(1, ...scored.map((item) => item.liveRaw));
  const ranked = scored.map((item) => {
    const liveNormalized = item.liveRaw / maxRaw;
    const baselineNormalized = clamp(item.baselineRaw, 0, 1);
    const score = Math.round(clamp(liveNormalized * 68 + baselineNormalized * 32, 0, 100));
    const history = historyByTrend.get(item.row.id) || [];
    const previous1h = history[0] || null;
    const previous24h = pickClosestSnapshot(
      history,
      new Date(recordedAt).getTime() - 24 * 3600000
    );
    const previous7d = pickClosestSnapshot(
      history,
      new Date(recordedAt).getTime() - 7 * 24 * 3600000
    );
    const previousScore1h = previous1h ? toNumber(previous1h.score) : score;
    const hourlyChange = previous1h ? Math.round(score - previousScore1h) : 0;
    const hourlyChangePercent = previous1h && previousScore1h
      ? Number((((score - previousScore1h) / previousScore1h) * 100).toFixed(1))
      : 0;
    return {
      ...item,
      score,
      previousScore1h,
      hourlyChange,
      hourlyChangePercent,
      change24h: previous24h ? Math.round(score - toNumber(previous24h.score)) : toNumber(item.row.change_24h, 0),
      change7d: previous7d ? Math.round(score - toNumber(previous7d.score)) : toNumber(item.row.change_7d, 0),
      previousRank: previous1h?.rank || item.row.current_rank || null,
      firstSeenAt: item.row.first_seen_at || recordedAt,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.liveRaw !== a.liveRaw) return b.liveRaw - a.liveRaw;
    return toNumber(SEED_BY_SLUG[b.row.slug]?.trendScore) - toNumber(SEED_BY_SLUG[a.row.slug]?.trendScore);
  });

  return ranked.map((item, index) => {
    const currentRank = index + 1;
    const rankMovement =
      item.previousRank != null ? Number(item.previousRank) - currentRank : 0;
    const status = deriveTrendStatus({
      score: item.score,
      hourlyChange: item.hourlyChange,
      firstSeenAt: item.firstSeenAt,
      now: recordedAt,
    });
    const summaryDecision = shouldRegenerateSummary({
      previousItem: item.row,
      nextScore: item.score,
      hourlyChange: item.hourlyChange,
      majorSourceCount: Object.keys(item.totals).filter(
        (key) => key !== "recency" && toNumber(item.totals[key]) > 0
      ).length,
      now: recordedAt,
    });
    return {
      ...item,
      currentRank,
      rankMovement,
      status,
      summaryDecision,
      whyTrending: buildWhyTrendingLines(item.row, item.totals, status),
      summaryCache: buildSummaryCache(item.row, summaryDecision, item.sourceSignals, recordedAt),
    };
  });
}

async function persistSourceStatuses(db, statuses) {
  if (!statuses.length) return;
  const rows = statuses.map((status) => ({
    source_name: status.sourceName,
    enabled: status.enabled,
    last_attempt: status.lastAttempt,
    last_success: status.lastSuccess,
    last_error: status.lastError,
    response_time_ms: status.responseTime,
    records_collected: status.recordsCollected,
    hourly_budget: status.hourlyBudget,
    hourly_used: status.hourlyUsed,
    daily_budget: status.dailyBudget,
    daily_used: status.dailyUsed,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from("trend_source_status").upsert(rows, {
    onConflict: "source_name",
  });
  if (error) throw error;
}

async function persistTrendRows(db, rankedRows, recordedAt) {
  const updates = rankedRows.map((item) => ({
    id: item.row.id,
    slug: item.row.slug,
    name: item.row.name,
    description: item.row.description,
    category: item.row.category,
    official_url: item.row.official_url || "",
    logo_url: item.row.logo_url || "",
    trend_score: item.score,
    previous_score_1h: item.previousScore1h,
    hourly_change: item.hourlyChange,
    hourly_change_percent: item.hourlyChangePercent,
    current_rank: item.currentRank,
    previous_rank: item.previousRank,
    rank_movement: item.rankMovement,
    change_24h: item.change24h,
    change_7d: item.change7d,
    status: item.status,
    why_trending: item.whyTrending,
    why_it_matters: item.row.why_it_matters || "",
    briclog_view: item.row.briclog_view || "",
    aliases: item.row.aliases || [],
    keywords: item.row.keywords || [],
    related_slugs: item.row.related_slugs || [],
    source_config: item.row.source_config || {},
    summary_cache: item.summaryCache,
    featured: item.row.featured ?? false,
    is_hidden: item.row.is_hidden ?? false,
    first_seen_at: item.row.first_seen_at || recordedAt,
    last_seen_at: recordedAt,
    last_snapshot_at: recordedAt,
    updated_at: recordedAt,
  }));
  const { error } = await db.from("trend_items").upsert(updates, {
    onConflict: "id",
  });
  if (error) throw error;
}

async function persistSnapshots(db, rankedRows, recordedAt) {
  const snapshotRows = rankedRows.map((item) => ({
    trend_id: item.row.id,
    score: item.score,
    rank: item.currentRank,
    change_1h: item.hourlyChange,
    change_1h_percent: item.hourlyChangePercent,
    status: item.status,
    recorded_at: recordedAt,
  }));
  const { error } = await db.from("trend_snapshots").insert(snapshotRows);
  if (error) throw error;
}

async function persistSignals(db, rankedRows, recordedAt) {
  const rows = rankedRows.flatMap((item) =>
    item.sourceSignals.map((signal) => ({
      trend_id: item.row.id,
      source: signal.source,
      metric: signal.metric,
      value: signal.value,
      change: signal.change,
      payload: signal.payload || {},
      recorded_at: signal.recordedAt || recordedAt,
    }))
  );
  if (!rows.length) return;
  const { error } = await db.from("trend_source_signals").insert(rows);
  if (error) throw error;
}

export async function runLiveTrendHourly({
  force = false,
  trigger = "cron",
  now = new Date(),
} = {}) {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  }

  await ensureSeedTrendItems(db);

  const bucketStartedAt = floorToUtcHour(now);
  const job = await createJobRun(db, bucketStartedAt, trigger, force);
  if (job.duplicate) {
    return {
      ok: true,
      idempotent: true,
      skipped: "duplicate_hour",
      job: job.data,
    };
  }

  const recordedAt = new Date(now).toISOString();
  const started = Date.now();

  try {
    const trendRows = await loadTrendRows(db);
    const historyByTrend = await loadSnapshotHistory(db, recordedAt);
    const sourceBundle = await collectLiveSourceBundle({
      trackedItems: trendRows,
      bucketDate: bucketStartedAt,
    });

    const rankedRows = computeTrendRows({
      trendRows,
      signals: sourceBundle.signals,
      historyByTrend,
      recordedAt,
    });

    await persistTrendRows(db, rankedRows, recordedAt);
    await persistSnapshots(db, rankedRows, recordedAt);
    await persistSignals(db, rankedRows, recordedAt);
    await persistSourceStatuses(db, sourceBundle.sourceStatuses);

    const durationMs = Date.now() - started;
    const onlineSources = sourceBundle.sourceStatuses.filter((status) => status.lastSuccess).length;
    await finishJobRun(db, job.data?.id, {
      status: "succeeded",
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      sources_online: onlineSources,
      sources_total: sourceBundle.sourceStatuses.length,
      trends_tracked: rankedRows.length,
      meta: {
        liveLabel: resolveFreshnessMeta(recordedAt).liveLabel,
        top3: rankedRows.slice(0, 3).map((item) => item.row.slug),
      },
    });

    return {
      ok: true,
      idempotent: false,
      recordedAt,
      liveLabel: resolveFreshnessMeta(recordedAt).liveLabel,
      tracked: rankedRows.length,
      top3: rankedRows.slice(0, 3).map((item) => ({
        slug: item.row.slug,
        name: item.row.name,
        score: item.score,
        rank: item.currentRank,
      })),
      sourceStatuses: sourceBundle.sourceStatuses,
    };
  } catch (error) {
    await finishJobRun(db, job.data?.id, {
      status: "failed",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      error: error.message || "hourly_trend_failed",
    });
    throw error;
  }
}

export async function fetchTrendSystemAdminStats(db = createServiceSupabase()) {
  if (!db) return null;
  try {
    const [{ data: latestJob }, { data: sources }, { count: trendsTracked }] = await Promise.all([
      db
        .from("trend_job_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("trend_source_status")
        .select("*")
        .order("source_name", { ascending: true }),
      db
        .from("trend_items")
        .select("id", { count: "exact", head: true })
        .eq("is_hidden", false),
    ]);

    const sourceRows = sources || [];
    const online = sourceRows.filter((source) => source.last_success).length;
    return {
      lastUpdate: latestJob?.finished_at || latestJob?.started_at || null,
      nextUpdate: nextUtcHour(new Date()).toISOString(),
      status:
        latestJob?.status === "failed"
          ? "ERROR"
          : latestJob?.finished_at
            ? "HEALTHY"
            : "IDLE",
      sourcesOnline: online,
      sourcesTotal: sourceRows.length,
      trendsTracked: trendsTracked ?? 0,
      lastJobDurationSec: latestJob?.duration_ms
        ? Number((latestJob.duration_ms / 1000).toFixed(1))
        : null,
      sources: sourceRows.map((source) => ({
        sourceName: source.source_name,
        enabled: source.enabled,
        lastAttempt: source.last_attempt,
        lastSuccess: source.last_success,
        lastError: source.last_error,
        responseTime: source.response_time_ms,
        recordsCollected: source.records_collected,
        hourlyBudget: source.hourly_budget,
        hourlyUsed: source.hourly_used,
        dailyBudget: source.daily_budget,
        dailyUsed: source.daily_used,
      })),
    };
  } catch {
    return null;
  }
}

export function enrichCatalogRows(rows = [], now = new Date()) {
  return rows.map((row, index) => {
    const freshness = resolveFreshnessMeta(row.last_snapshot_at || row.updated_at, now);
    const status = String(row.status || "stable").trim().toLowerCase();
    return {
      id: row.id || `trend-${row.slug || index + 1}`,
      slug: String(row.slug || "").trim().toLowerCase(),
      name: String(row.name || "").trim(),
      description: String(row.description || "").trim(),
      category: String(row.category || "tools").trim().toLowerCase(),
      categoryLabel:
        TREND_CATEGORY_LABELS[String(row.category || "tools").trim().toLowerCase()] ||
        String(row.category || "tools").trim().toUpperCase(),
      officialUrl: String(row.official_url || row.officialUrl || "").trim(),
      logoUrl: String(row.logo_url || row.logoUrl || "").trim(),
      trendScore: clamp(Math.round(toNumber(row.trend_score || row.trendScore, 0)), 0, 100),
      previousScore1h: toNumber(row.previous_score_1h || row.previousScore1h, 0),
      hourlyChange: toNumber(row.hourly_change || row.hourlyChange, 0),
      hourlyChangePercent: toNumber(row.hourly_change_percent || row.hourlyChangePercent, 0),
      change24h: toNumber(row.change_24h || row.change24h, 0),
      change7d: toNumber(row.change_7d || row.change7d, 0),
      status,
      statusLabel: TREND_STATUS_LABELS[status] || String(status || "stable").toUpperCase(),
      currentRank: Number(row.current_rank || row.currentRank || index + 1),
      previousRank: row.previous_rank || row.previousRank || null,
      rankMovement: toNumber(row.rank_movement || row.rankMovement, 0),
      direction: directionFromValue(toNumber(row.hourly_change || row.hourlyChange, 0)),
      whyTrending: row.why_trending || row.whyTrending || [],
      whyItMatters: String(row.why_it_matters || row.whyItMatters || "").trim(),
      briclogView: String(row.briclog_view || row.briclogView || "").trim(),
      sourceSignals: row.source_signals || row.sourceSignals || [],
      aliases: row.aliases || [],
      keywords: row.keywords || [],
      relatedSlugs: row.related_slugs || row.relatedSlugs || [],
      updatedAt: freshness.updatedAt,
      updatedLabel: freshness.updatedLabel,
      freshnessLabel: freshness.freshnessLabel,
      freshnessState: freshness.freshnessState,
      liveLabel: freshness.liveLabel,
      isLive: freshness.isLive,
      isSample: false,
    };
  });
}

export function buildCatalogSections(items = []) {
  const topItems = [...items]
    .sort((a, b) => {
      if (a.currentRank !== b.currentRank) return a.currentRank - b.currentRank;
      return b.trendScore - a.trendScore;
    })
    .slice(0, LIVE_TREND_TOP_LIMIT);

  const tickerItems = topItems.slice(0, LIVE_TREND_TICKER_LIMIT);
  const risingItems = [...items]
    .sort((a, b) => {
      if (b.hourlyChange !== a.hourlyChange) return b.hourlyChange - a.hourlyChange;
      return b.trendScore - a.trendScore;
    })
    .filter((item) => item.hourlyChange > 0)
    .slice(0, LIVE_TREND_RISING_LIMIT);

  const newItems = [...items]
    .filter((item) => item.status === "new")
    .slice(0, LIVE_TREND_NEW_LIMIT);

  return { topItems, tickerItems, risingItems, newItems };
}
