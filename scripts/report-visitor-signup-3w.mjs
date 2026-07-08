/**
 * 최근 3주 방문자·가입 시도 집계 (KST)
 * Run: node --import ./scripts/register-alias.mjs scripts/report-visitor-signup-3w.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { countUniqueSessionsSince } from "../lib/admin/memberCountAudit.js";
import {
  parseSignupIntentPath,
  parseSignupFunnelPath,
} from "../lib/admin/signupFunnelMetrics.js";
import {
  SIGNUP_INTENT_PATH_PREFIX,
  SIGNUP_FUNNEL_PATH_PREFIX,
} from "../lib/analytics/signupIntent.js";
import { classifyVisitSource } from "../lib/analytics/visitSource.js";

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

function startKstDay(y, m, d) {
  return new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+09:00`
  );
}

function pct(n, d) {
  if (!d || n == null) return null;
  return Math.round((n / d) * 1000) / 10;
}

function isPageview(path = "") {
  return !String(path).startsWith("__");
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env missing");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const weeks = [
  { label: "6/16~6/22", start: startKstDay(2026, 6, 16), end: startKstDay(2026, 6, 23) },
  { label: "6/23~6/29", start: startKstDay(2026, 6, 23), end: startKstDay(2026, 6, 30) },
  { label: "6/30~7/6", start: startKstDay(2026, 6, 30), end: startKstDay(2026, 7, 7) },
  { label: "7/7(오늘)", start: startKstDay(2026, 7, 7), end: new Date() },
];

const since21 = startKstDay(2026, 6, 16);

async function fetchRows(since, until = null) {
  const all = [];
  let from = 0;
  const page = 1000;
  const selectFull =
    "session_id,path,referrer,utm_source,utm_medium,source_channel,created_at";
  const selectFallback = "session_id,path,referrer,created_at";
  let select = selectFull;

  while (true) {
    let q = db
      .from("site_visits")
      .select(select)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (until) q = q.lt("created_at", until.toISOString());
    const { data, error } = await q;
    if (error && /utm_|source_channel|column/i.test(error.message) && select === selectFull) {
      select = selectFallback;
      from = 0;
      all.length = 0;
      continue;
    }
    if (error) throw new Error(error.message);
    const batch = data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return all;
}

async function countProfiles(since, until = null) {
  let q = db
    .from("profiles")
    .select("id,profile_completed_at")
    .gte("created_at", since.toISOString());
  if (until) q = q.lt("created_at", until.toISOString());
  const { data, error } = await q;
  if (error) return { signups: null, completed: null, error: error.message };
  const rows = data || [];
  return {
    signups: rows.length,
    completed: rows.filter((r) => r.profile_completed_at).length,
    error: null,
  };
}

function summarizeWeek(rows) {
  const sessions = new Set(rows.map((r) => r.session_id).filter(Boolean));
  const pageviews = rows.filter((r) => isPageview(r.path));
  const intents = rows.filter((r) =>
    String(r.path || "").startsWith(SIGNUP_INTENT_PATH_PREFIX)
  );
  const funnel = rows.filter((r) =>
    String(r.path || "").startsWith(SIGNUP_FUNNEL_PATH_PREFIX)
  );
  const intentSources = {};
  for (const r of intents) {
    const s = parseSignupIntentPath(r.path) || "unknown";
    intentSources[s] = (intentSources[s] || 0) + 1;
  }
  const channels = {};
  for (const r of pageviews) {
    const ch =
      r.source_channel ||
      classifyVisitSource({
        referrer: r.referrer,
        utmSource: r.utm_source,
        utmMedium: r.utm_medium,
      });
    channels[ch] = (channels[ch] || 0) + 1;
  }
  return {
    uniqueVisitors: sessions.size,
    pageviews: pageviews.length,
    signupIntentClicks: intents.length,
    funnel: {
      modalOpen: funnel.filter(
        (r) => parseSignupFunnelPath(r.path)?.step === "modal_open"
      ).length,
      formSubmit: funnel.filter(
        (r) => parseSignupFunnelPath(r.path)?.step === "form_submit"
      ).length,
      signupSuccess: funnel.filter(
        (r) => parseSignupFunnelPath(r.path)?.step === "signup_success"
      ).length,
    },
    topIntentSources: Object.entries(intentSources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count })),
    topChannels: Object.entries(channels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
  };
}

const allRows = await fetchRows(since21);
const unique21 = await countUniqueSessionsSince(db, since21.toISOString());
const profiles21 = await countProfiles(since21);

const intents21 = allRows.filter((r) =>
  String(r.path || "").startsWith(SIGNUP_INTENT_PATH_PREFIX)
).length;

const weekly = [];
for (const w of weeks) {
  const rows = await fetchRows(w.start, w.end);
  const summary = summarizeWeek(rows);
  const prof = await countProfiles(w.start, w.end);
  weekly.push({
    week: w.label,
    ...summary,
    newProfiles: prof.signups,
    profileCompleted: prof.completed,
    visitorToIntentPct: pct(summary.signupIntentClicks, summary.uniqueVisitors),
    visitorToSignupPct: pct(prof.signups, summary.uniqueVisitors),
  });
}

const report = {
  asOf: new Date().toISOString(),
  periodKst: "2026-06-16 ~ 2026-07-07 (21일)",
  dataSource: "site_visits + profiles (Supabase prod)",
  total21d: {
    uniqueVisitors: unique21.count,
    uniqueVisitorsTruncated: unique21.truncated === true,
    pageviews: allRows.filter((r) => isPageview(r.path)).length,
    allRowsCount: allRows.length,
    signupIntentClicks: intents21,
    newProfiles: profiles21.signups,
    profileCompleted: profiles21.completed,
    visitorToIntentPct: pct(intents21, unique21.count),
    visitorToSignupPct: pct(profiles21.signups, unique21.count),
  },
  weekly,
};

console.log(JSON.stringify(report, null, 2));

const { data: latest } = await db
  .from("site_visits")
  .select("created_at,path")
  .order("created_at", { ascending: false })
  .limit(3);
const { data: profiles } = await db
  .from("profiles")
  .select("created_at,email,nickname,profile_completed_at")
  .gte("created_at", since21.toISOString())
  .order("created_at", { ascending: false });
console.error(
  "\nmeta:",
  JSON.stringify({ latestVisits: latest, signupsInPeriod: profiles }, null, 2)
);
