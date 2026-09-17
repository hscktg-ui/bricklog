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
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message || body?.error || JSON.stringify(body).slice(0, 500);
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
    { id: "trend_source_status", table: "trend_source_status" },
    { id: "trend_job_runs", table: "trend_job_runs" },
  ];
  const out = {};
  for (const check of checks) {
    const { error } = await db.from(check.table).select("*", { head: true, count: "exact" }).limit(1);
    out[check.id] = !error;
  }
  const { error: itemError } = await db
    .from("trend_items")
    .select("current_rank", { head: true, count: "exact" })
    .limit(1);
  out.trend_items_hourly_columns = !itemError;
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
  console.log(await probe(db));

  const sql = readFileSync(resolve(root, "supabase/schema-v25-live-hourly-trends.sql"), "utf8");
  if (dbUrl) await runViaPg(dbUrl, sql);
  else await runViaManagementApi(ref, accessToken, sql);

  console.log("\n=== 적용 후 ===");
  const after = await probe(db);
  console.log(after);
  if (!after.trend_source_status || !after.trend_job_runs || !after.trend_items_hourly_columns) {
    console.error("\nhourly trend schema 일부 미적용");
    process.exit(1);
  }
  console.log("\nhourly trend schema 적용 완료.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
