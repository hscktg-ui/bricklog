/**
 * Supabase 우선 스키마 순차 적용
 * 1. schema-v17-admin-ops.sql
 * 2. schema-v18-feedback-loop.sql
 * 3. schema-v5-billing.sql → v5b → v5c → v5d
 * 4. schema-v12-data-assets.sql
 *
 * SUPABASE_ACCESS_TOKEN 또는 SUPABASE_DB_URL 필요 (.env.local)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCHEMA_ORDER = [
  "supabase/schema-v17-admin-ops.sql",
  "supabase/schema-v18-feedback-loop.sql",
  "supabase/schema-v5-billing.sql",
  "supabase/schema-v5b-plans-brand-studio.sql",
  "supabase/schema-v5c-toss-billing.sql",
  "supabase/schema-v5d-subscription-management.sql",
  "supabase/schema-v12-data-assets.sql",
];

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
  return body;
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
    { id: "last_seen_at", table: "profiles", select: "last_seen_at" },
    { id: "site_visits", table: "site_visits", select: "id" },
    { id: "feedback_intents", table: "content_feedback", select: "intents,rewrite_round" },
    { id: "feedback_intents", table: "content_feedback", select: "intents,rewrite_round" },
    { id: "user_subscriptions", table: "user_subscriptions", select: "user_id" },
    { id: "usage_monthly", table: "usage_monthly", select: "id" },
    { id: "billing_checkouts", table: "billing_checkouts", select: "id" },
    { id: "data_asset_registry", table: "data_asset_registry", select: "id" },
  ];
  const out = {};
  for (const c of checks) {
    const { error } = await db.from(c.table).select(c.select).limit(1);
    out[c.id] = !error;
  }
  return out;
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
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

  const skipIfApplied = {
    "supabase/schema-v17-admin-ops.sql": before.last_seen_at && before.site_visits,
    "supabase/schema-v18-feedback-loop.sql": before.feedback_intents,
    "supabase/schema-v5-billing.sql":
      before.user_subscriptions && before.usage_monthly,
    "supabase/schema-v5b-plans-brand-studio.sql":
      before.user_subscriptions && before.usage_monthly,
    "supabase/schema-v5c-toss-billing.sql": before.billing_checkouts,
    "supabase/schema-v5d-subscription-management.sql":
      before.user_subscriptions && before.usage_monthly,
    "supabase/schema-v12-data-assets.sql": before.data_asset_registry,
  };

  for (const rel of SCHEMA_ORDER) {
    if (skipIfApplied[rel]) {
      console.log(`\n▶ ${rel} — skip (already applied)`);
      continue;
    }
    const filePath = resolve(root, rel);
    const sql = readFileSync(filePath, "utf8");
    console.log(`\n▶ ${rel}`);
    try {
      if (dbUrl) {
        await runViaPg(dbUrl, sql);
      } else {
        await runViaManagementApi(ref, accessToken, sql);
      }
      console.log("  OK");
    } catch (err) {
      const msg = String(err.message || "");
      if (/already exists/i.test(msg)) {
        console.log("  OK (idempotent — already exists)");
        continue;
      }
      console.error("  FAIL:", err.message);
      process.exit(1);
    }
  }

  console.log("\n=== 적용 후 ===");
  const after = await probe(db);
  console.log(after);

  const allOk = Object.values(after).every(Boolean);
  if (!allOk) {
    console.error("\n일부 항목 미적용 — Supabase 대시보드에서 수동 확인 필요");
    process.exit(1);
  }
  console.log("\n우선 스키마(v17·v18·v5) 적용 완료.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
