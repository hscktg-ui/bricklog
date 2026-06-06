import { createServiceSupabase } from "@/lib/supabase/server";
import { PUBLIC_TEST_DAILY_LIMIT } from "@/lib/publicTest/publicTestConfig";

export function seoulDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
}

function endOfDayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

async function countRunsFor(db, runDate, column, value) {
  const { count, error } = await db
    .from("public_test_runs")
    .select("id", { count: "exact", head: true })
    .eq("run_date", runDate)
    .eq(column, value)
    .eq("succeeded", true);
  if (error) throw error;
  return count ?? 0;
}

/**
 * @returns {Promise<{ ok: boolean, used: number, remaining: number, resetsAt: string } | null>}
 */
export async function assessPublicTestQuotaFromDb(ip, sessionId = "") {
  const db = createServiceSupabase();
  if (!db) return null;

  const runDate = seoulDayKey();
  const sid = String(sessionId || "").slice(0, 64);

  try {
    const ipCount = await countRunsFor(db, runDate, "client_ip", ip);
    const sessionCount = sid
      ? await countRunsFor(db, runDate, "session_id", sid)
      : 0;
    const used = Math.max(ipCount, sessionCount);
    const remaining = Math.max(0, PUBLIC_TEST_DAILY_LIMIT - used);

    return {
      ok: used < PUBLIC_TEST_DAILY_LIMIT,
      used,
      remaining,
      resetsAt: endOfDayIso(),
    };
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{ used: number, remaining: number, resetsAt: string } | null>}
 */
export async function recordPublicTestRunToDb(
  ip,
  sessionId = "",
  meta = {}
) {
  const db = createServiceSupabase();
  if (!db) return null;

  const runDate = seoulDayKey();
  const sid = String(sessionId || "").slice(0, 64) || null;

  try {
    const { error: insertErr } = await db.from("public_test_runs").insert({
      run_date: runDate,
      client_ip: ip,
      session_id: sid,
      brand_name: meta.brandName || null,
      region: meta.region || null,
      topic: meta.topic || null,
      succeeded: true,
    });
    if (insertErr) throw insertErr;

    const ipCount = await countRunsFor(db, runDate, "client_ip", ip);
    const sessionCount = sid
      ? await countRunsFor(db, runDate, "session_id", sid)
      : 0;
    const used = Math.max(ipCount, sessionCount);

    return {
      used,
      remaining: Math.max(0, PUBLIC_TEST_DAILY_LIMIT - used),
      resetsAt: endOfDayIso(),
    };
  } catch {
    return null;
  }
}

export async function isPublicTestQuotaTableReady() {
  const db = createServiceSupabase();
  if (!db) return false;
  const { error } = await db.from("public_test_runs").select("id").limit(1);
  return !error;
}
