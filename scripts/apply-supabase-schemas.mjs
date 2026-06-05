/**
 * Supabase SQL 스키마 적용 (v3 memory + v6 feedback + v15 global engine)
 *
 * 방법 A — Management API (권장):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # dashboard/account/tokens
 *   node scripts/apply-supabase-schemas.mjs
 *
 * 방법 B — Postgres 직접:
 *   $env:SUPABASE_DB_URL = "postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres"
 *   node scripts/apply-supabase-schemas.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCHEMA_FILES = [
  "supabase/schema-v3-memory.sql",
  "supabase/schema-v6-feedback-learning.sql",
  "supabase/schema-v15-global-engine-rules.sql",
];

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split("\n")) {
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
      body?.message || body?.error || JSON.stringify(body).slice(0, 400);
    throw new Error(`Management API ${res.status}: ${msg}`);
  }
  return body;
}

async function runViaPg(dbUrl, sql) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function probeTables(serviceKey, url) {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const tables = [
    ["content_items", "id"],
    ["content_feedback", "id"],
    ["brand_learning_profiles", "id"],
    ["global_quality_insights", "id"],
    ["global_engine_rules", "rule_key"],
  ];
  const out = {};
  for (const [name, col] of tables) {
    const { error } = await db.from(name).select(col).limit(1);
    out[name] = !error;
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
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)");
    process.exit(1);
  }

  console.log("=== 적용 전 테이블 상태 ===");
  const before = await probeTables(serviceKey, url);
  console.log(before);

  if (
    before.content_items &&
    before.content_feedback &&
    before.brand_learning_profiles &&
    before.global_quality_insights &&
    before.global_engine_rules
  ) {
    console.log("\n모든 학습 테이블이 이미 있습니다. 스킵.");
    return;
  }

  if (!accessToken && !dbUrl) {
    console.error(
      "\nSQL 실행 자격증명이 없습니다.\n" +
        "  SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)\n" +
        "  또는 SUPABASE_DB_URL (Project Settings → Database → Connection string)\n" +
        "을 설정한 뒤 다시 실행하세요."
    );
    process.exit(1);
  }

  for (const rel of SCHEMA_FILES) {
    const filePath = resolve(root, rel);
    const sql = readFileSync(filePath, "utf8");
    console.log(`\n▶ Applying ${rel} ...`);
    try {
      if (dbUrl) {
        await runViaPg(dbUrl, sql);
      } else {
        await runViaManagementApi(ref, accessToken, sql);
      }
      console.log(`  OK: ${rel}`);
    } catch (err) {
      console.error(`  FAIL: ${rel}`, err.message);
      process.exit(1);
    }
  }

  console.log("\n=== 적용 후 테이블 상태 ===");
  const after = await probeTables(serviceKey, url);
  console.log(after);

  const ok =
    after.content_items &&
    after.content_feedback &&
    after.brand_learning_profiles &&
    after.global_engine_rules;
  if (!ok) {
    console.error("\n일부 테이블이 아직 없습니다. schema-v2-saas.sql(brands) 선행 여부를 확인하세요.");
    process.exit(1);
  }
  console.log("\n학습·피드백 스키마 적용 완료.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
