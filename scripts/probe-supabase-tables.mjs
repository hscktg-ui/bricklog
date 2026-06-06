/**
 * Supabase 테이블·컬럼 존재 여부 프로브
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

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "missing_env" }, null, 2));
  process.exit(0);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function probe(select, table) {
  const { error } = await db.from(table).select(select).limit(1);
  if (!error) return { ok: true };
  const msg = error.message || String(error.code);
  return { ok: false, error: msg };
}

const checks = [
  { id: "profiles", table: "profiles", select: "id,last_seen_at" },
  { id: "site_visits", table: "site_visits", select: "id" },
  { id: "content_feedback_intents", table: "content_feedback", select: "intents,rewrite_round" },
  { id: "content_items", table: "content_items", select: "id" },
  { id: "content_events", table: "content_events", select: "id" },
  { id: "brands", table: "brands", select: "id" },
  { id: "phone_otp_verifications", table: "phone_otp_verifications", select: "id" },
  { id: "user_subscriptions", table: "user_subscriptions", select: "user_id,plan" },
  { id: "usage_monthly", table: "usage_monthly", select: "id" },
  { id: "profiles_phone_verified", table: "profiles", select: "phone_verified_at" },
  { id: "global_engine_rules", table: "global_engine_rules", select: "rule_key" },
  { id: "brand_learning_profiles", table: "brand_learning_profiles", select: "id" },
  { id: "daily_usage_snapshots", table: "daily_usage_snapshots", select: "id" },
  { id: "data_asset_registry", table: "data_asset_registry", select: "id" },
  { id: "error_logs", table: "error_logs", select: "id" },
  { id: "subscriptions", table: "subscriptions", select: "id" },
];

const results = {};
for (const c of checks) {
  results[c.id] = await probe(c.select, c.table);
}

console.log(JSON.stringify({ url: url.replace(/https:\/\/([^.]+).*/, "https://$1..."), results }, null, 2));
