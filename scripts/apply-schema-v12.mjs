/**
 * schema-v12-data-assets.sql 단독 적용
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
    throw new Error(
      `Management API ${res.status}: ${
        body?.message || body?.error || JSON.stringify(body).slice(0, 400)
      }`
    );
  }
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const token = env.SUPABASE_ACCESS_TOKEN?.trim();
const ref = env.SUPABASE_PROJECT_REF || projectRefFromUrl(url);
const safePath = resolve(root, "supabase/schema-v12-data-assets-safe.sql");
const sql = readFileSync(safePath, "utf8");

if (!url || !key || !token) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY, ACCESS_TOKEN 필요");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const before = await db.from("data_asset_registry").select("id").limit(1);
if (!before.error) {
  console.log("OK: data_asset_registry already exists");
  process.exit(0);
}

console.log("Applying schema-v12-data-assets.sql ...");
try {
  await runViaManagementApi(ref, token, sql);
} catch (err) {
  console.error("API:", err.message);
  process.exit(1);
}

for (let i = 0; i < 5; i += 1) {
  await new Promise((r) => setTimeout(r, 1500));
  const after = await db.from("data_asset_registry").select("id").limit(1);
  if (!after.error) {
    console.log("OK: schema-v12 applied");
    process.exit(0);
  }
}
console.error("FAIL: data_asset_registry still missing after apply");
process.exit(1);
