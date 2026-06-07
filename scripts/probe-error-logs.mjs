/**
 * 오늘 error_logs 집계 (운영 디버그)
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
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
  console.log("NO_CREDS");
  process.exit(0);
}

const db = createClient(url, key);
const today = new Date();
today.setHours(0, 0, 0, 0);

const { data, error } = await db
  .from("error_logs")
  .select("id, route, message, meta, created_at")
  .gte("created_at", today.toISOString())
  .order("created_at", { ascending: false })
  .limit(50);

if (error) {
  console.error("QUERY_ERR", error.message);
  process.exit(1);
}

const byRoute = {};
for (const r of data || []) {
  byRoute[r.route] = (byRoute[r.route] || 0) + 1;
}

console.log("TODAY_COUNT", (data || []).length);
console.log("BY_ROUTE", JSON.stringify(byRoute, null, 2));

const msgCounts = {};
for (const r of data || []) {
  const m = r.message || "unknown";
  msgCounts[m] = (msgCounts[m] || 0) + 1;
}
console.log("BY_MESSAGE", JSON.stringify(msgCounts, null, 2));

for (const r of (data || []).slice(0, 15)) {
  console.log("---");
  console.log(r.created_at, r.route);
  console.log(r.message?.slice(0, 500));
  if (r.meta && Object.keys(r.meta).length) {
    console.log("meta:", JSON.stringify(r.meta).slice(0, 400));
  }
}
