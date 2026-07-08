/**
 * 런칭 이후 샘플·주제·생성 실측 리포트
 * Run: node --import ./scripts/register-alias.mjs scripts/report-launch-samples.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  SIGNUP_INTENT_PATH_PREFIX,
} from "../lib/analytics/signupIntent.js";
import { classifyMemberAudience } from "../lib/admin/memberAudience.js";

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

function topN(items, keyFn, n = 15) {
  const map = {};
  for (const row of items) {
    const k = String(keyFn(row) || "").trim();
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function weekKey(iso) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

async function fetchAll(db, table, select, orderCol = "created_at") {
  const all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + page - 1);
    if (error) return { rows: [], error: error.message };
    const batch = data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return { rows: all, error: null };
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env missing");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const [
  publicTests,
  siteVisits,
  profiles,
  generations,
  contentItems,
  usageLogs,
  brands,
] = await Promise.all([
  fetchAll(
    db,
    "public_test_runs",
    "id,brand_name,region,topic,succeeded,run_date,client_ip,session_id,created_at"
  ),
  fetchAll(db, "site_visits", "path,session_id,created_at,referrer"),
  fetchAll(db, "profiles", "id,email,created_at"),
  fetchAll(
    db,
    "generations",
    "id,user_id,main_keyword,business_type,region,blog,created_at"
  ),
  fetchAll(
    db,
    "content_items",
    "id,user_id,channel,title,full_content,prompt_input,quality_score,created_at"
  ),
  fetchAll(db, "usage_logs", "id,user_id,action,created_at"),
  fetchAll(db, "brands", "id,user_id,name,industry,created_at"),
]);

const emailById = Object.fromEntries(
  (profiles.rows || []).map((p) => [p.id, p.email])
);

const ptRows = publicTests.rows || [];
const ptSuccess = ptRows.filter((r) => r.succeeded !== false);
const ptVisitors = new Set();
for (const r of ptSuccess) {
  const sid = String(r.session_id || "").trim();
  if (sid) ptVisitors.add(`s:${sid}`);
  else if (r.client_ip) ptVisitors.add(`i:${r.client_ip}`);
}

const ptByWeek = {};
for (const r of ptSuccess) {
  const wk = weekKey(r.created_at);
  ptByWeek[wk] = (ptByWeek[wk] || 0) + 1;
}

const signupPublicTest = (siteVisits.rows || []).filter((r) => {
  const p = String(r.path || "");
  return (
    p.startsWith(`${SIGNUP_INTENT_PATH_PREFIX}public_test`) ||
    p.includes("public_test")
  );
});

const landingPaths = (siteVisits.rows || []).filter((r) => {
  const p = String(r.path || "");
  return p === "/" || p === "/#public-brand-test" || p.includes("public-brand-test");
});

const blogUsage = (usageLogs.rows || []).filter((r) => r.action === "blog_generate");
const channelUsage = (usageLogs.rows || []).filter((r) =>
  /generate/.test(r.action || "")
);

const genWithText = (generations.rows || []).filter(
  (r) => String(r.blog || "").replace(/\s/g, "").length >= 80
);
const contentWithText = (contentItems.rows || []).filter(
  (r) => String(r.full_content || "").replace(/\s/g, "").length >= 80
);

const externalProfiles = (profiles.rows || []).filter(
  (p) => classifyMemberAudience(p.email) === "external"
);

const report = {
  at: new Date().toISOString(),
  periodNote: "런칭=첫 profiles·site_visits·public_test_runs 기준 추정",
  launchSignals: {
    firstProfileAt: profiles.rows?.[0]?.created_at || null,
    firstSiteVisitAt: siteVisits.rows?.[0]?.created_at || null,
    firstPublicTestAt: ptRows[0]?.created_at || null,
    profileCount: profiles.rows?.length || 0,
    externalSignupCount: externalProfiles.length,
  },
  publicBrandTest: {
    tableReady: !publicTests.error,
    totalRecordedRuns: ptSuccess.length,
    uniqueSampleVisitors: ptVisitors.size,
    failedOrOther: ptRows.length - ptSuccess.length,
    firstRun: ptSuccess[0] || null,
    lastRun: ptSuccess[ptSuccess.length - 1] || null,
    runsPerDayTop: topN(ptSuccess, (r) => r.run_date, 14),
    topBrands: topN(ptSuccess, (r) => r.brand_name, 15),
    topTopics: topN(ptSuccess, (r) => r.topic, 20),
    topRegions: topN(ptSuccess, (r) => r.region, 12),
    recentSamples: ptSuccess.slice(-15).reverse().map((r) => ({
      at: r.created_at,
      brand: r.brand_name,
      region: r.region,
      topic: r.topic,
    })),
    note: "public_test_runs = API 성공(runPublicBrandTest ok)만 기록. 쿼터 초과 instant·게이트 실패 미포함",
  },
  funnelSignals: {
    landingOrTestPathVisits: landingPaths.length,
    publicTestSignupCtaClicks: signupPublicTest.length,
    topPublicTestCtaSources: topN(signupPublicTest, (r) => r.path, 8),
  },
  loggedInGeneration: {
    generationsTotal: generations.rows?.length || 0,
    generationsWithBody: genWithText.length,
    contentItemsTotal: contentItems.rows?.length || 0,
    contentItemsWithBody: contentWithText.length,
    brandsTotal: brands.rows?.length || 0,
    blogGenerateUsageLogs: blogUsage.length,
    anyGenerateUsageLogs: channelUsage.length,
    topGenerationKeywords: topN(generations.rows || [], (r) => r.main_keyword, 15),
    topContentTitles: topN(contentItems.rows || [], (r) => r.title, 15),
    recentGenerations: (generations.rows || [])
      .slice(-10)
      .reverse()
      .map((r) => ({
        at: r.created_at,
        email: emailById[r.user_id] || null,
        keyword: r.main_keyword,
        region: r.region,
        industry: r.business_type,
        chars: String(r.blog || "").length,
        excerpt: String(r.blog || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100),
      })),
    recentContentItems: (contentItems.rows || [])
      .slice(-10)
      .reverse()
      .map((r) => ({
        at: r.created_at,
        email: emailById[r.user_id] || null,
        channel: r.channel,
        title: r.title,
        topic: r.prompt_input?.topic || r.prompt_input?.mainKeyword,
        qualityScore: r.quality_score,
        excerpt: String(r.full_content || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100),
      })),
  },
  interpretation: [],
};

if (!ptRows.length) {
  report.interpretation.push(
    "public_test_runs 비어 있음 — schema-v19 미적용 시그널 또는 성공 샘플 0건"
  );
}
if (ptSuccess.length > 0 && contentWithText.length === 0 && genWithText.length === 0) {
  report.interpretation.push(
    "맛보기(비로그인) 샘플은 있으나 로그인 후 저장·generation DB 기록은 없음"
  );
}
if (externalProfiles.length <= 1) {
  report.interpretation.push(
    `실외부 가입 ${externalProfiles.length}명 — 샘플→가입 전환 추적은 CTA ${signupPublicTest.length}회`
  );
}

const outDir = resolve(root, "artifacts", "launch-samples");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "latest-summary.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
console.log(`\nwritten: ${outPath}`);
