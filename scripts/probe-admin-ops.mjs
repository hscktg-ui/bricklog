/**
 * Admin·운영 점검 — DB 집계 (로컬 .env.local)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function dayKey(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(iso)
  );
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env missing");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function probePublicTest() {
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const { data: rows, error, count } = await db
    .from("public_test_runs")
    .select("client_ip, session_id, created_at, brand_name", { count: "exact" })
    .eq("succeeded", true)
    .gte("created_at", since30.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return { tableReady: false, error: error.message };

  const visitors = new Set();
  for (const r of rows || []) {
    const sid = String(r.session_id || "").trim();
    visitors.add(sid ? `s:${sid}` : `i:${r.client_ip || ""}`);
  }

  const today = dayKey(new Date());
  const runsToday = (rows || []).filter((r) => dayKey(r.created_at) === today)
    .length;

  const { count: totalRuns } = await db
    .from("public_test_runs")
    .select("id", { count: "exact", head: true })
    .eq("succeeded", true);

  const { data: allVisitors } = await db
    .from("public_test_runs")
    .select("client_ip, session_id")
    .eq("succeeded", true)
    .limit(12000);

  const allV = new Set();
  for (const r of allVisitors || []) {
    const sid = String(r.session_id || "").trim();
    allV.add(sid ? `s:${sid}` : `i:${r.client_ip || ""}`);
  }

  return {
    tableReady: true,
    totalSampleUsers: allV.size,
    totalRuns: totalRuns ?? 0,
    runsToday,
    runs30d: count ?? rows?.length ?? 0,
    lastRunAt: rows?.[0]?.created_at ?? null,
  };
}

const publicBrandTest = await probePublicTest();
const pending = await db
  .from("global_quality_insights")
  .select("id", { count: "exact", head: true })
  .eq("status", "pending");
const approved = await db
  .from("global_quality_insights")
  .select("id", { count: "exact", head: true })
  .eq("status", "approved");

console.log(
  JSON.stringify(
    {
      at: new Date().toISOString(),
      publicBrandTest,
      insights: {
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
      },
    },
    null,
    2
  )
);
