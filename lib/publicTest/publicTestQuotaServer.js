import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { PUBLIC_TEST_DAILY_LIMIT } from "@/lib/publicTest/publicTestConfig";

const dailyBuckets = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCount(map, key) {
  const row = map.get(key);
  if (!row || row.date !== todayKey()) return 0;
  return row.count;
}

function bump(map, key) {
  const date = todayKey();
  const row = map.get(key);
  if (!row || row.date !== date) {
    map.set(key, { date, count: 1 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

/**
 * IP + sessionId 이중 제한 (일 3회)
 */
export function assessPublicTestQuota(request, sessionId = "") {
  const ip = getClientIp(request);
  const date = todayKey();
  const ipKey = `public-test:ip:${ip}:${date}`;
  const sessionKey = sessionId
    ? `public-test:session:${sessionId.slice(0, 64)}:${date}`
    : null;

  const burst = checkRateLimit(`public-test-burst:${ip}`, {
    max: 6,
    windowMs: 60_000,
  });
  if (!burst.ok) {
    return { ok: false, reason: "burst", remaining: 0, resetsAt: endOfDayIso() };
  }

  const ipCount = getCount(dailyBuckets, ipKey);
  const sessionCount = sessionKey ? getCount(dailyBuckets, sessionKey) : 0;
  const used = Math.max(ipCount, sessionCount);

  if (used >= PUBLIC_TEST_DAILY_LIMIT) {
    return {
      ok: false,
      reason: "daily_limit",
      remaining: 0,
      used,
      resetsAt: endOfDayIso(),
    };
  }

  return {
    ok: true,
    remaining: PUBLIC_TEST_DAILY_LIMIT - used,
    used,
    resetsAt: endOfDayIso(),
  };
}

export function recordPublicTestRun(request, sessionId = "") {
  const ip = getClientIp(request);
  const date = todayKey();
  const ipKey = `public-test:ip:${ip}:${date}`;
  const sessionKey = sessionId
    ? `public-test:session:${sessionId.slice(0, 64)}:${date}`
    : null;
  const ipCount = bump(dailyBuckets, ipKey);
  const sessionCount = sessionKey ? bump(dailyBuckets, sessionKey) : 0;
  const used = Math.max(ipCount, sessionCount);
  return {
    remaining: Math.max(0, PUBLIC_TEST_DAILY_LIMIT - used),
    used,
    resetsAt: endOfDayIso(),
  };
}

function endOfDayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
