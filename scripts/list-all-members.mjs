/**
 * 전체 회원 목록 + 직원/테스트/외부 추정 분류
 * Run: node --import ./scripts/register-alias.mjs scripts/list-all-members.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "../lib/api/auth.js";
import { E2E_TEST_EMAIL } from "../lib/qa/e2eTestCredentials.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function classifyMember(row, { brandCount, contentCount }) {
  const email = String(row.email || "").toLowerCase();
  if (!email) return "unknown";
  if (isAdminEmail(email)) return "admin_operator";
  if (email === E2E_TEST_EMAIL.toLowerCase()) return "e2e_test";
  if (/@briclog\.ai$/i.test(email)) return "internal_briclog_domain";
  if (/^meticulous-/i.test(email) || /^hundred-/i.test(email) || /smoke|e2e|test/i.test(email)) {
    return "automated_test";
  }
  if (brandCount > 0 || contentCount > 0) return "external_active_user";
  return "external_signup_only";
}

const LABEL = {
  admin_operator: "운영자(ADMIN)",
  e2e_test: "E2E 테스트 계정",
  internal_briclog_domain: "내부 @briclog.ai",
  automated_test: "자동화/스모크 테스트",
  external_active_user: "외부 유저(브랜드·콘텐츠 있음)",
  external_signup_only: "외부 유저(가입만)",
  unknown: "미분류",
};

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env missing");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function fetchAllProfiles() {
  const all = [];
  let from = 0;
  const page = 1000;
  const fields =
    "id,email,nickname,display_name,role,created_at,last_login_at,last_seen_at,profile_completed_at,phone_verified_at,contact_phone,acquisition_source_channel,acquisition_path,provider,plan";

  while (true) {
    let res = await db
      .from("profiles")
      .select(fields)
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (res.error && /acquisition_|contact_phone|profile_completed|phone_verified|last_seen/i.test(res.error.message)) {
      res = await db
        .from("profiles")
        .select(
          "id,email,nickname,display_name,role,created_at,last_login_at,provider,plan"
        )
        .order("created_at", { ascending: true })
        .range(from, from + page - 1);
    }
    if (res.error) throw new Error(res.error.message);
    const batch = res.data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return all;
}

const profiles = await fetchAllProfiles();

const brandRes = await db.from("brands").select("id,user_id,name,industry,created_at");
const brands = brandRes.data || [];
const brandsByUser = {};
for (const b of brands) {
  if (!b.user_id) continue;
  if (!brandsByUser[b.user_id]) brandsByUser[b.user_id] = [];
  brandsByUser[b.user_id].push(b);
}

let contentsByUser = {};
const contentRes = await db.from("contents").select("id,user_id,title,channel,created_at");
if (!contentRes.error) {
  for (const c of contentRes.data || []) {
    if (!c.user_id) continue;
    contentsByUser[c.user_id] = (contentsByUser[c.user_id] || 0) + 1;
  }
}

const authUsers = await db.auth.admin.listUsers({ perPage: 1000 });

const members = profiles.map((p) => {
  const userBrands = brandsByUser[p.id] || [];
  const contentCount = contentsByUser[p.id] || 0;
  const kind = classifyMember(p, {
    brandCount: userBrands.length,
    contentCount,
  });
  const authMeta = authUsers.data?.users?.find((u) => u.id === p.id);
  return {
    no: 0,
    id: p.id,
    email: p.email,
    nickname: p.nickname || p.display_name || null,
    role: p.role,
    kind,
    kindLabel: LABEL[kind],
    createdAtKst: p.created_at,
    lastLoginAt: p.last_login_at || authMeta?.last_sign_in_at || null,
    lastSeenAt: p.last_seen_at || null,
    profileCompleted: Boolean(p.profile_completed_at),
    phoneVerified: Boolean(p.phone_verified_at),
    plan: p.plan || "FREE",
    brandCount: userBrands.length,
    brandNames: userBrands.map((b) => b.name).slice(0, 5),
    industries: [...new Set(userBrands.map((b) => b.industry).filter(Boolean))],
    contentCount,
    acquisition: p.acquisition_source_channel || null,
    signupPath: p.acquisition_path || null,
    emailConfirmed: authMeta?.email_confirmed_at != null,
  };
});

members.forEach((m, i) => {
  m.no = i + 1;
});

const byKind = {};
for (const m of members) {
  byKind[m.kind] = (byKind[m.kind] || 0) + 1;
}

console.log(
  JSON.stringify(
    {
      asOf: new Date().toISOString(),
      total: members.length,
      adminEmailsConfigured: Boolean(env.BRICLOG_ADMIN_EMAILS),
      summaryByKind: Object.entries(byKind).map(([kind, count]) => ({
        kind,
        label: LABEL[kind],
        count,
      })),
      members,
    },
    null,
    2
  )
);
