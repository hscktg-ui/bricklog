import assert from "node:assert/strict";
import {
  computeTrendRows,
  deriveTrendStatus,
  floorToUtcHour,
  resolveFreshnessMeta,
  shouldRegenerateSummary,
} from "../lib/trends/liveEngine.js";

const hour = floorToUtcHour("2026-09-17T11:43:29.000Z");
assert.equal(hour.toISOString(), "2026-09-17T11:00:00.000Z");

const fresh = resolveFreshnessMeta("2026-09-17T11:00:00.000Z", "2026-09-17T11:20:00.000Z");
assert.equal(fresh.freshnessState, "fresh");

const delayed = resolveFreshnessMeta("2026-09-17T08:00:00.000Z", "2026-09-17T11:20:00.000Z");
assert.equal(delayed.freshnessState, "delayed");

assert.equal(
  deriveTrendStatus({
    score: 94,
    hourlyChange: 8,
    firstSeenAt: "2026-09-10T00:00:00.000Z",
    now: "2026-09-17T11:00:00.000Z",
  }),
  "hot"
);
assert.equal(
  deriveTrendStatus({
    score: 61,
    hourlyChange: 4,
    firstSeenAt: "2026-09-10T00:00:00.000Z",
    now: "2026-09-17T11:00:00.000Z",
  }),
  "rising"
);
assert.equal(
  deriveTrendStatus({
    score: 41,
    hourlyChange: 0,
    firstSeenAt: "2026-09-17T04:00:00.000Z",
    now: "2026-09-17T11:00:00.000Z",
  }),
  "new"
);

const summaryKeep = shouldRegenerateSummary({
  previousItem: {
    status: "stable",
    summary_cache: { generatedAt: "2026-09-17T10:00:00.000Z" },
  },
  nextScore: 70,
  hourlyChange: 2,
  majorSourceCount: 1,
  now: "2026-09-17T11:00:00.000Z",
});
assert.equal(summaryKeep.regenerate, false);

const summaryRefresh = shouldRegenerateSummary({
  previousItem: {
    status: "new",
    summary_cache: { generatedAt: "2026-09-10T10:00:00.000Z" },
  },
  nextScore: 91,
  hourlyChange: 9,
  majorSourceCount: 2,
  now: "2026-09-17T11:00:00.000Z",
});
assert.equal(summaryRefresh.regenerate, true);

const trendRows = [
  {
    id: "1",
    slug: "chatgpt",
    name: "ChatGPT",
    category: "models",
    trend_score: 70,
    change_24h: 5,
    change_7d: 12,
    status: "stable",
    why_trending: [],
    aliases: ["GPT"],
    keywords: [],
    related_slugs: [],
    first_seen_at: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "2",
    slug: "claude",
    name: "Claude",
    category: "models",
    trend_score: 68,
    change_24h: 3,
    change_7d: 10,
    status: "stable",
    why_trending: [],
    aliases: [],
    keywords: [],
    related_slugs: [],
    first_seen_at: "2026-09-10T00:00:00.000Z",
  },
];

const historyByTrend = new Map([
  [
    "1",
    [{ score: 73, rank: 1, recorded_at: "2026-09-17T10:00:00.000Z" }],
  ],
  [
    "2",
    [{ score: 64, rank: 2, recorded_at: "2026-09-17T10:00:00.000Z" }],
  ],
]);

const signals = [
  { trendSlug: "claude", source: "official", metric: "officialMomentum", value: 4, recordedAt: "2026-09-17T11:00:00.000Z" },
  { trendSlug: "claude", source: "news", metric: "mediaMomentum", value: 2, recordedAt: "2026-09-17T11:00:00.000Z" },
  { trendSlug: "chatgpt", source: "news", metric: "mediaMomentum", value: 1, recordedAt: "2026-09-17T11:00:00.000Z" },
];

const ranked = computeTrendRows({
  trendRows,
  signals,
  historyByTrend,
  recordedAt: "2026-09-17T11:00:00.000Z",
});

assert.equal(ranked[0].row.slug, "claude");
assert.equal(ranked[0].currentRank, 1);
assert.equal(ranked[0].rankMovement, 1);
assert.equal(ranked[1].row.slug, "chatgpt");

console.log("test-live-trend-engine: ok");
