/**
 * 패치로 해결된 동일 오류 로그 정리 (운영 조언 오탐 방지)
 * 사용: node scripts/resolve-known-error-logs.mjs [--apply]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const RESOLVED_MESSAGES = ["e.test is not a function"];

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
  console.error("NO_CREDS");
  process.exit(1);
}

const db = createClient(url, key);

const { data, error } = await db
  .from("error_logs")
  .select("id, route, message, created_at")
  .in("message", RESOLVED_MESSAGES)
  .order("created_at", { ascending: false })
  .limit(200);

if (error) {
  console.error("QUERY_ERR", error.message);
  process.exit(1);
}

const rows = data || [];
console.log("RESOLVED_CANDIDATES", rows.length);
for (const r of rows.slice(0, 5)) {
  console.log(`  ${r.created_at} ${r.route} ${r.message}`);
}

if (!APPLY) {
  console.log("DRY_RUN — 삭제하려면 --apply 추가");
  process.exit(0);
}

if (!rows.length) {
  console.log("NOTHING_TO_DELETE");
  process.exit(0);
}

const ids = rows.map((r) => r.id);
const { error: delErr } = await db.from("error_logs").delete().in("id", ids);

if (delErr) {
  console.error("DELETE_ERR", delErr.message);
  process.exit(1);
}

console.log("DELETED", ids.length);
