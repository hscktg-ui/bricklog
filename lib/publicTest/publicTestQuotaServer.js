import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { PUBLIC_TEST_DAILY_LIMIT } from "@/lib/publicTest/publicTestConfig";
import {
  assessPublicTestQuotaFromDb,
  recordPublicTestRunToDb,
  seoulDayKey,
} from "@/lib/publicTest/publicTestQuotaDb";

const dailyBuckets = new Map();

function getCount(map, key) {
  const row = map.get(key);
  if (!row || row.date !== seoulDayKey()) return 0;
  return row.count;
}

function bump(map, key) {
  const date = seoulDayKey();
  const row = map.get(key);
  if (!row || row.date !== date) {
    map.set(key, { date, count: 1 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

function assessMemoryQuota(ip, sessionId = "") {
  const date = seoulDayKey();
  const ipKey = `public-test:ip:${ip}:${date}`;
  const sessionKey = sessionId
    ? `public-test:session:${sessionId.slice(0, 64)}:${date}`
    : null;

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

function recordMemoryRun(ip, sessionId = "") {
  const date = seoulDayKey();
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

/**
 * IP + sessionId 이중 제한 (일 3회) — Supabase 우선, 미설정 시 인메모리 폴백
 */
export async function assessPublicTestQuota(request, sessionId = "") {
  const ip = getClientIp(request);

  const burst = checkRateLimit(`public-test-burst:${ip}`, {
    max: 6,
    windowMs: 60_000,
  });
  if (!burst.ok) {
    return { ok: false, reason: "burst", remaining: 0, resetsAt: endOfDayIso() };
  }

  const dbQuota = await assessPublicTestQuotaFromDb(ip, sessionId);
  if (dbQuota) {
    if (!dbQuota.ok) {
      return {
        ok: false,
        reason: "daily_limit",
        remaining: 0,
        used: dbQuota.used,
        resetsAt: dbQuota.resetsAt,
      };
    }
    return {
      ok: true,
      remaining: dbQuota.remaining,
      used: dbQuota.used,
      resetsAt: dbQuota.resetsAt,
    };
  }

  return assessMemoryQuota(ip, sessionId);
}

export async function recordPublicTestRun(request, sessionId = "", meta = {}) {
  const ip = getClientIp(request);

  const dbRecorded = await recordPublicTestRunToDb(ip, sessionId, meta);
  if (dbRecorded) return dbRecorded;

  return recordMemoryRun(ip, sessionId);
}

function endOfDayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
