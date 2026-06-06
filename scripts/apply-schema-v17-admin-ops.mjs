/**
 * schema-v17-admin-ops.sql 적용 (접속·방문 집계)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sql = readFileSync(resolve(root, "supabase/schema-v17-admin-ops.sql"), "utf8");

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
  const { error } = await admin.rpc("exec_sql", { query: stmt }).catch(() => ({
    error: { message: "rpc_missing" },
  }));
  if (error?.message === "rpc_missing") {
    console.log(
      "Supabase SQL Editor에서 supabase/schema-v17-admin-ops.sql 을 직접 실행해 주세요."
    );
    process.exit(0);
  }
  if (error) {
    console.error("FAIL:", error.message, "\n", stmt.slice(0, 80));
    process.exit(1);
  }
}

console.log("OK: schema-v17-admin-ops applied (or run SQL manually in dashboard)");
