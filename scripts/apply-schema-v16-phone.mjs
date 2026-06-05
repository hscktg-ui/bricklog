/**
 * schema-v16-phone-unique.sql 적용
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
    const msg = body?.message || body?.error || JSON.stringify(body).slice(0, 400);
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

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: probeErr } = await db
    .from("profiles")
    .select("contact_phone_normalized")
    .limit(1);

  if (!probeErr) {
    console.log("profiles.contact_phone_normalized — 이미 존재. 스킵.");
    return;
  }

  if (!accessToken && !dbUrl) {
    console.error("SUPABASE_ACCESS_TOKEN 또는 SUPABASE_DB_URL 필요");
    process.exit(1);
  }

  const sql = readFileSync(resolve(root, "supabase/schema-v16-phone-unique.sql"), "utf8");
  console.log("▶ Applying schema-v16-phone-unique.sql ...");
  if (dbUrl) {
    await runViaPg(dbUrl, sql);
  } else {
    await runViaManagementApi(ref, accessToken, sql);
  }

  const { error: afterErr } = await db
    .from("profiles")
    .select("contact_phone_normalized")
    .limit(1);
  if (afterErr) {
    console.error("적용 후에도 컬럼 확인 실패:", afterErr.message);
    process.exit(1);
  }
  console.log("OK: schema-v16-phone-unique 적용 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
