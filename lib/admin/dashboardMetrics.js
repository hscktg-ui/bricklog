/** @typedef {{ date: string, count: number }} DayPoint */
/** @typedef {{ date: string, avg: number | null, count: number }} QualityDayPoint */

const KST = "Asia/Seoul";

export function dayKey(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST }).format(d);
}

export function lastNDayKeys(n) {
  const keys = [];
  const anchor = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function initDayCounts(keys) {
  const m = {};
  for (const k of keys) m[k] = 0;
  return m;
}

/**
 * @param {string[]} keys
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} dateField
 */
export function countByDay(keys, rows, dateField = "created_at") {
  const counts = initDayCounts(keys);
  for (const row of rows) {
    const k = dayKey(row[dateField]);
    if (k && counts[k] !== undefined) counts[k] += 1;
  }
  return keys.map((date) => ({ date, count: counts[date] }));
}

/**
 * @param {string[]} keys
 * @param {Array<{ created_at: string, quality_score?: number | null }>} rows
 */
export function avgQualityByDay(keys, rows) {
  const sums = initDayCounts(keys);
  const counts = initDayCounts(keys);
  for (const row of rows) {
    const score = row.quality_score;
    if (typeof score !== "number" || Number.isNaN(score)) continue;
    const k = dayKey(row.created_at);
    if (k && sums[k] !== undefined) {
      sums[k] += score;
      counts[k] += 1;
    }
  }
  return keys.map((date) => {
    const c = counts[date];
    return {
      date,
      count: c,
      avg: c ? Math.round(sums[date] / c) : null,
    };
  });
}

export function topCounts(items, keyFn, limit = 8) {
  const m = {};
  for (const x of items) {
    const k = keyFn(x);
    if (!k) continue;
    const key = String(k).slice(0, 48);
    m[key] = (m[key] || 0) + 1;
  }
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function aggregateFailReasons(items, limit = 10) {
  const failReasons = {};
  for (const it of items) {
    const reasons =
      it.prompt_input?.generation_log?.fail_reasons ||
      it.prompt_input?.fail_reasons ||
      [];
    for (const r of reasons) {
      const key = String(r).slice(0, 60);
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }
  return Object.entries(failReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }));
}

export function feedbackRatio(feedbackRatios) {
  const good = feedbackRatios?.good ?? 0;
  const neutral = feedbackRatios?.neutral ?? 0;
  const bad = feedbackRatios?.bad ?? 0;
  const total = good + neutral + bad;
  if (!total) return { goodPct: 0, total: 0 };
  return {
    goodPct: Math.round((good / total) * 100),
    total,
    good,
    neutral,
    bad,
  };
}

/**
 * Dwell: session_duration in meta (seconds) or proxy from event span per user-day.
 * @param {Array<{ user_id: string, created_at: string, meta?: object }>} events
 */
export function computeDwellStats(events) {
  const sessionDurations = [];
  const byUserDay = {};

  for (const e of events) {
    const uid = e.user_id;
    if (!uid) continue;
    const dk = `${uid}:${dayKey(e.created_at)}`;
    if (!byUserDay[dk]) byUserDay[dk] = { times: [], events: 0 };
    byUserDay[dk].events += 1;
    const t = new Date(e.created_at).getTime();
    if (!Number.isNaN(t)) byUserDay[dk].times.push(t);

    const meta = e.meta || {};
    const sec =
      meta.session_duration ??
      meta.sessionDuration ??
      meta.dwell_seconds ??
      null;
    if (typeof sec === "number" && sec > 0 && sec < 86400) {
      sessionDurations.push(sec);
    }
  }

  const proxyMinutes = [];
  for (const v of Object.values(byUserDay)) {
    if (v.times.length < 2) continue;
    const spanMs = Math.max(...v.times) - Math.min(...v.times);
    if (spanMs > 0 && spanMs < 6 * 60 * 60 * 1000) {
      proxyMinutes.push(spanMs / 60000);
    }
  }

  const eventCounts = Object.values(byUserDay).map((v) => v.events);
  const avgEventsPerUserDay = eventCounts.length
    ? Math.round(
        (eventCounts.reduce((a, b) => a + b, 0) / eventCounts.length) * 10
      ) / 10
    : 0;

  const hasSessionDuration = sessionDurations.length > 0;
  const durations = hasSessionDuration ? sessionDurations : null;
  const avgSessionMinutes = durations
    ? Math.round(
        (durations.reduce((a, b) => a + b, 0) / durations.length / 60) * 10
      ) / 10
    : proxyMinutes.length
      ? Math.round(
          (proxyMinutes.reduce((a, b) => a + b, 0) / proxyMinutes.length) * 10
        ) / 10
      : null;

  return {
    hasSessionDuration,
    avgSessionMinutes,
    avgEventsPerUserDay,
    userDaySamples: eventCounts.length,
    source: hasSessionDuration ? "session_duration" : "event_span_proxy",
  };
}

export function distinctActiveUsers(rows, days) {
  const since = new Date(isoDaysAgo(days)).getTime();
  const ids = new Set();
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t >= since && r.user_id) ids.add(r.user_id);
  }
  return ids.size;
}

const PERSONA_LABELS = {
  visit_review: "방문·후기",
  local_guide: "동네 가이드",
  brand_story: "브랜드 스토리",
  info_intro: "정보·소개",
  auto: "자동",
  plain_review: "담백 후기",
  local_blogger: "동네 블로거",
  brand_intro: "브랜드 소개",
  expert_info: "전문 정보",
  essay: "감성 에세이",
  real_use: "실사용 후기",
  magazine: "매거진",
  interview: "인터뷰",
  column: "칼럼",
};

export function personaLabel(key) {
  if (!key) return "미지정";
  return PERSONA_LABELS[key] || key;
}

const PLAN_LABELS = {
  free: "Free",
  brand: "Brand",
  studio: "Studio",
  pro: "Pro (레거시)",
};

export function planLabel(key) {
  return PLAN_LABELS[key] || key || "—";
}

export function buildDashboardPayload({
  profileRows = [],
  contentItemRows = [],
  eventRows = [],
  feedbackRows = [],
  subscriptionRows = [],
  userCount = null,
  pendingInsightsCount = 0,
  feedbackStats = null,
}) {
  const keys7 = lastNDayKeys(7);
  const keys30 = lastNDayKeys(30);
  const monthIso = monthStartIso();

  const signups7 = countByDay(keys7, profileRows, "created_at");
  const signups30 = countByDay(keys30, profileRows, "created_at");
  const generationsPerDay = countByDay(keys30, contentItemRows, "created_at");
  const qualityTrend = avgQualityByDay(keys30, contentItemRows);

  const generationsToday = contentItemRows.filter(
    (r) => dayKey(r.created_at) === dayKey(new Date())
  ).length;
  const generationsMonth = contentItemRows.filter(
    (r) => new Date(r.created_at) >= new Date(monthIso)
  ).length;

  const scores30 = contentItemRows
    .map((r) => r.quality_score)
    .filter((n) => typeof n === "number");
  const avgQualityScore30d = scores30.length
    ? Math.round(scores30.reduce((a, b) => a + b, 0) / scores30.length)
    : feedbackStats?.avgQuality ?? null;

  const active7d = distinctActiveUsers(
    [...contentItemRows, ...eventRows],
    7
  );

  const fbRatio = feedbackStats?.feedbackRatios
    ? feedbackRatio(feedbackStats.feedbackRatios)
    : feedbackRatio(
        feedbackRows.reduce(
          (acc, f) => {
            if (acc[f.reaction] !== undefined) acc[f.reaction] += 1;
            return acc;
          },
          { good: 0, neutral: 0, bad: 0 }
        )
      );

  const topFailReasons =
    feedbackStats?.topFailReasons?.length > 0
      ? feedbackStats.topFailReasons
      : aggregateFailReasons(contentItemRows);

  const dwell = computeDwellStats(eventRows);

  const topPersonas = topCounts(
    contentItemRows,
    (r) => r.persona || r.prompt_input?.persona || r.prompt_input?.v4Speaker,
    8
  ).map(({ key, count }) => ({
    key,
    label: personaLabel(key),
    count,
  }));

  const channelUsage = topCounts(contentItemRows, (r) => r.channel || "other", 6);
  const planDistribution = topCounts(subscriptionRows, (r) => r.plan, 6).map(
    ({ key, count }) => ({ key, label: planLabel(key), count })
  );

  const topIndustries = topCounts(
    contentItemRows,
    (r) =>
      r.prompt_input?.industry ||
      r.prompt_input?.businessType ||
      r.prompt_input?.business_type,
    6
  );

  return {
    cards: {
      totalUsers: userCount,
      active7d,
      generationsToday,
      generationsMonth,
      avgQualityScore: avgQualityScore30d,
      feedbackGoodPct: fbRatio.goodPct,
      feedbackTotal: fbRatio.total,
    },
    charts: {
      signups7,
      signups30,
      generationsPerDay,
      qualityTrend,
      feedbackBreakdown: [
        { id: "good", label: "좋음", count: fbRatio.good },
        { id: "neutral", label: "보통", count: fbRatio.neutral },
        { id: "bad", label: "별로", count: fbRatio.bad },
      ],
      topFailReasons,
    },
    dwell,
    usagePatterns: {
      topPersonas,
      channelUsage,
      planDistribution,
      topIndustries,
    },
    quality: {
      pendingInsightsCount,
      avgQualityScore30d,
    },
  };
}
