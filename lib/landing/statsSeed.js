/** 공개 랜딩 통계 시드 (클라이언트·서버 공용, PII 없음) */

export function dayKeyKst(now = new Date()) {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function deterministicJitter(bucket, salt, spread) {
  let h = 2166136261;
  const s = `${bucket}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % (spread + 1);
}

function parseIntEnv(name, fallback) {
  if (typeof process !== "undefined" && process.env) {
    const n = parseInt(process.env[name] ?? "", 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function launchDate() {
  const raw =
    typeof process !== "undefined" && process.env
      ? (process.env.BRICLOG_STATS_LAUNCH_DATE ?? "").trim()
      : "";
  if (raw) {
    const d = new Date(`${raw}T00:00:00+09:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date("2026-05-01T00:00:00+09:00");
}

export function daysSinceLaunch(now = new Date()) {
  const ms = now.getTime() - launchDate().getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** 출시일 기준 바닥값 + 매일 KST 기준 결정론적 증가 (0에서 시작하지 않음) */
const METRIC_RAMP = {
  weekPosts: {
    floor: parseIntEnv("BRICLOG_STATS_FLOOR_WEEK_POSTS", 920),
    dailyMin: 4,
    dailyMax: 19,
    jitter: 14,
  },
  monthPosts: {
    floor: parseIntEnv("BRICLOG_STATS_FLOOR_MONTH_POSTS", 2680),
    dailyMin: 9,
    dailyMax: 38,
    jitter: 22,
  },
  monthBrands: {
    floor: parseIntEnv("BRICLOG_STATS_FLOOR_MONTH_BRANDS", 310),
    dailyMin: 1,
    dailyMax: 5,
    jitter: 7,
  },
  totalUsers: {
    floor: parseIntEnv("BRICLOG_STATS_FLOOR_USERS", 1580),
    dailyMin: 6,
    dailyMax: 24,
    jitter: 12,
  },
};

function dailyIncrement(dayBucket, salt, min, max) {
  const spread = Math.max(0, max - min);
  return min + deterministicJitter(dayBucket, salt, spread);
}

function rampedValue(metricKey, now = new Date()) {
  const cfg = METRIC_RAMP[metricKey];
  const days = daysSinceLaunch(now);
  const today = dayKeyKst(now);
  const avgDaily = Math.floor((cfg.dailyMin + cfg.dailyMax) / 2);
  const baseGrowth = days * avgDaily;
  const todayBump = deterministicJitter(today, `${metricKey}-today`, cfg.jitter);
  const launchBump = deterministicJitter(dayKeyKst(launchDate()), `${metricKey}-launch`, cfg.jitter);
  return cfg.floor + baseGrowth + todayBump + launchBump;
}

export function formatStatDisplay(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return `${n.toLocaleString("ko-KR")}+`;
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

export function computeSeedStats(now = new Date()) {
  const dayBucket = dayKeyKst(now);
  const weekPosts = rampedValue("weekPosts", now);
  const monthPosts = rampedValue("monthPosts", now);
  const monthBrands = rampedValue("monthBrands", now);
  const totalUsers = rampedValue("totalUsers", now);

  return {
    mode: "seed",
    statsDateKst: dayBucket,
    weekPosts,
    monthBrands,
    totalUsers,
    monthPosts,
    metrics: buildMetrics({ weekPosts, monthBrands, totalUsers, monthPosts }),
  };
}
