/**
 * 회원·유입 집계 점검 — profiles vs auth.users vs site_visits
 * 로컬: .env.local 또는 sync:vercel-env 후 실행
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { fetchMemberCountAudit } from "../lib/admin/memberCountAudit.js";

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
  console.error("Supabase env missing — npm run sync:vercel-env 후 재시도");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const audit = await fetchMemberCountAudit(db);

const signups7dRes = await db
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

console.log(
  JSON.stringify(
    {
      ...audit,
      signups7d: signups7dRes.error ? null : signups7dRes.count ?? 0,
      signupConversion7dPct:
        signups7dRes.error || !audit.uniqueVisitors7d
          ? null
          : Math.round(
              ((signups7dRes.count ?? 0) / audit.uniqueVisitors7d) * 1000
            ) / 10,
      adminLiveWouldShow: {
        totalUsers: audit.profilesTotal,
        signupsToday: audit.signupsToday,
        visitsToday: audit.visitsTodayPageviews,
        uniqueVisitorsToday: audit.uniqueVisitorsToday,
      },
    },
    null,
    2
  )
);
