import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

async function runViaManagementApi(ref, token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      body?.message || body?.error || JSON.stringify(body).slice(0, 500);
    throw new Error(`Management API ${res.status}: ${msg}`);
  }
}

async function runViaPg(dbUrl, sql) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function probe(db) {
  const checks = [
    { id: "trend_items", table: "trend_items", select: "id" },
    { id: "trend_snapshots", table: "trend_snapshots", select: "id" },
    { id: "trend_source_signals", table: "trend_source_signals", select: "id" },
  ];
  const out = {};
  for (const check of checks) {
    const { error } = await db.from(check.table).select(check.select).limit(1);
    out[check.id] = !error;
  }
  return out;
}

async function main() {
  loadEnvLocal(root);
  const env = { ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
  const dbUrl = env.SUPABASE_DB_URL?.trim();
  const ref = env.SUPABASE_PROJECT_REF || projectRefFromUrl(url);

  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
    process.exit(1);
  }
  if (!accessToken && !dbUrl) {
    console.error("SUPABASE_ACCESS_TOKEN 또는 SUPABASE_DB_URL 필요");
    process.exit(1);
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  console.log("=== 적용 전 ===");
  const before = await probe(db);
  console.log(before);
  if (before.trend_items && before.trend_snapshots && before.trend_source_signals) {
    console.log("\ntrend schema already applied. skip.");
    return;
  }

  const sql = readFileSync(resolve(root, "supabase/schema-v24-ai-trends.sql"), "utf8");
  if (dbUrl) await runViaPg(dbUrl, sql);
  else await runViaManagementApi(ref, accessToken, sql);

  console.log("\n=== 적용 후 ===");
  const after = await probe(db);
  console.log(after);
  if (!after.trend_items || !after.trend_snapshots || !after.trend_source_signals) {
    console.error("\ntrend schema 일부 미적용");
    process.exit(1);
  }
  console.log("\ntrend schema 적용 완료.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
