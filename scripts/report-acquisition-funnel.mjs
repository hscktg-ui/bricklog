/**
 * BRICLOG 유입 → 맛보기 → 가입 → 활성화 퍼널 (Supabase prod)
 *
 * Run:
 *   npm run report:acquisition-funnel
 *
 * Output:
 *   artifacts/acquisition-funnel/latest.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { classifyMemberAudience } from "../lib/admin/memberAudience.js";
import {
  classifyVisitSource,
  VISIT_SOURCE_LABELS,
} from "../lib/analytics/visitSource.js";
import {
  SIGNUP_FUNNEL_PATH_PREFIX,
  SIGNUP_INTENT_PATH_PREFIX,
} from "../lib/analytics/signupIntent.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DAY_MS = 86_400_000;
const MAX_ROWS = 20_000;
const WINDOWS = [7, 30, 90];

function loadEnvLocal() {
  const path = resolve(
    root,
    process.env.BRICLOG_ENV_FILE || ".env.local"
  );
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function pct(value, total) {
  if (!total || value == null) return null;
  return Math.round((value / total) * 1000) / 10;
}

function dayKeyKst(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isPageview(path = "") {
  const value = String(path || "");
  return Boolean(value) && !value.startsWith("__") && value !== "/admin";
}

function isSignupStep(path = "", step = "") {
  return String(path || "").startsWith(`${SIGNUP_FUNNEL_PATH_PREFIX}${step}:`);
}

function sourceOf(row = {}) {
  if (row.source_channel) return row.source_channel;
  return classifyVisitSource({
    referrer: row.referrer,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
  });
}

function countTop(values = [], limit = 8) {
  const map = new Map();
  for (const value of values.map(String).map((v) => v.trim()).filter(Boolean)) {
    map.set(value, (map.get(value) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function sessionsFor(rows = []) {
  return new Set(rows.map((row) => row.session_id).filter(Boolean));
}

function intersectSize(a, b) {
  let count = 0;
  for (const value of a) if (b.has(value)) count += 1;
  return count;
}

async function fetchPaged(table, select, sinceIso, options = {}) {
  const all = [];
  const page = 1000;
  let from = 0;
  while (all.length < MAX_ROWS) {
    let query = db
      .from(table)
      .select(select)
      .gte(options.dateField || "created_at", sinceIso)
      .order(options.dateField || "created_at", { ascending: true })
      .range(from, from + page - 1);
    if (options.filter) query = options.filter(query);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message, ready: false };
    const batch = data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return {
    rows: all.slice(0, MAX_ROWS),
    error: null,
    ready: true,
    truncated: all.length >= MAX_ROWS,
  };
}

async function fetchPagedWithFallback(
  table,
  selects,
  sinceIso,
  options = {}
) {
  let last = null;
  for (const select of selects) {
    const pack = await fetchPaged(table, select, sinceIso, options);
    if (pack.ready) return { ...pack, select };
    last = pack;
    if (!/column|schema cache|does not exist/i.test(pack.error || "")) {
      return pack;
    }
  }
  return last || { rows: [], error: "no_select", ready: false };
}

function buildSessionFirstTouches(pageviews = []) {
  const first = new Map();
  for (const row of pageviews) {
    if (!row.session_id || first.has(row.session_id)) continue;
    first.set(row.session_id, row);
  }
  return first;
}

function summarizeWindow(days, visits, tests, profiles, activatedUserIds) {
  const since = new Date(Date.now() - days * DAY_MS);
  const sinceIso = since.toISOString();
  const rows = visits.filter((row) => row.created_at >= sinceIso);
  const pageviews = rows.filter((row) => isPageview(row.path));
  const firstTouches = buildSessionFirstTouches(pageviews);
  const visitorSessions = new Set(firstTouches.keys());

  const testRows = tests.filter((row) => row.created_at >= sinceIso);
  const testSessions = sessionsFor(testRows);
  const intentRows = rows.filter((row) =>
    String(row.path || "").startsWith(SIGNUP_INTENT_PATH_PREFIX)
  );
  const intentSessions = sessionsFor(intentRows);
  const modalSessions = sessionsFor(
    rows.filter((row) => isSignupStep(row.path, "modal_open"))
  );
  const submitSessions = sessionsFor(
    rows.filter((row) => isSignupStep(row.path, "form_submit"))
  );
  const successSessions = sessionsFor(
    rows.filter((row) => isSignupStep(row.path, "signup_success"))
  );

  const externalProfiles = profiles.filter(
    (profile) =>
      profile.created_at >= sinceIso &&
      classifyMemberAudience(profile.email) === "external"
  );
  const activated = externalProfiles.filter((profile) =>
    activatedUserIds.has(profile.id)
  );

  const firstTouchRows = [...firstTouches.values()];
  const channelRows = firstTouchRows.map((row) => ({
    id: sourceOf(row),
    campaign: row.utm_campaign || "",
  }));
  const channels = countTop(channelRows.map((row) => row.id), 10).map((row) => ({
    id: row.label,
    label: VISIT_SOURCE_LABELS[row.label] || row.label,
    sessions: row.count,
    sharePct: pct(row.count, visitorSessions.size),
  }));

  const acquired = countTop(
    externalProfiles.map(
      (profile) => profile.acquisition_source_channel || "unknown"
    ),
    10
  ).map((row) => ({
    id: row.label,
    label: VISIT_SOURCE_LABELS[row.label] || row.label,
    signups: row.count,
    sharePct: pct(row.count, externalProfiles.length),
  }));

  return {
    days,
    since: sinceIso,
    visitors: visitorSessions.size,
    pageviews: pageviews.length,
    pageviewsPerVisitor:
      visitorSessions.size > 0
        ? Math.round((pageviews.length / visitorSessions.size) * 10) / 10
        : null,
    publicTestRuns: testRows.length,
    publicTestUsers: testSessions.size,
    visitorToTestPct: pct(testSessions.size, visitorSessions.size),
    visitorToTestTrackedPct: pct(
      intersectSize(visitorSessions, testSessions),
      visitorSessions.size
    ),
    signupIntentUsers: intentSessions.size,
    testToIntentPct: pct(intentSessions.size, testSessions.size),
    testToIntentTrackedPct: pct(
      intersectSize(testSessions, intentSessions),
      testSessions.size
    ),
    signupModalUsers: modalSessions.size,
    signupSubmitUsers: submitSessions.size,
    signupSuccessTrackedUsers: successSessions.size,
    externalSignups: externalProfiles.length,
    activatedExternalSignups: activated.length,
    visitorToSignupPct: pct(externalProfiles.length, visitorSessions.size),
    signupToActivationPct: pct(activated.length, externalProfiles.length),
    channels,
    acquiredSignups: acquired,
    topLandingPaths: countTop(pageviews.map((row) => row.path), 8),
    topCampaigns: countTop(
      firstTouchRows
        .filter((row) => row.utm_campaign)
        .map(
          (row) =>
            `${row.utm_source || "?"} / ${row.utm_medium || "?"} / ${row.utm_campaign}`
        ),
      8
    ),
  };
}

function buildDailySeries(visits, tests, profiles, days = 30) {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(dayKeyKst(Date.now() - i * DAY_MS));
  }
  const byDate = Object.fromEntries(
    keys.map((date) => [
      date,
      { date, visitors: new Set(), tests: new Set(), signups: 0 },
    ])
  );
  for (const row of visits.filter((row) => isPageview(row.path))) {
    const bucket = byDate[dayKeyKst(row.created_at)];
    if (bucket && row.session_id) bucket.visitors.add(row.session_id);
  }
  for (const row of tests) {
    const bucket = byDate[dayKeyKst(row.created_at)];
    if (bucket && row.session_id) bucket.tests.add(row.session_id);
  }
  for (const profile of profiles) {
    if (classifyMemberAudience(profile.email) !== "external") continue;
    const bucket = byDate[dayKeyKst(profile.created_at)];
    if (bucket) bucket.signups += 1;
  }
  return Object.values(byDate).map((row) => ({
    date: row.date,
    visitors: row.visitors.size,
    tests: row.tests.size,
    signups: row.signups,
  }));
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const since90 = new Date(Date.now() - 90 * DAY_MS).toISOString();

const [visitsPack, testsPack, profilesPack, generationsPack, contentPack] =
  await Promise.all([
    fetchPagedWithFallback(
      "site_visits",
      [
        "session_id,path,referrer,utm_source,utm_medium,utm_campaign,source_channel,user_id,created_at",
        "session_id,path,referrer,user_id,created_at",
        "session_id,path,referrer,created_at",
      ],
      since90
    ),
    fetchPaged(
      "public_test_runs",
      "session_id,brand_name,region,topic,succeeded,created_at",
      since90,
      { filter: (query) => query.eq("succeeded", true) }
    ),
    fetchPagedWithFallback(
      "profiles",
      [
        "id,email,created_at,profile_completed_at,acquisition_source_channel,acquisition_path,acquisition_utm_source,acquisition_utm_medium,acquisition_utm_campaign",
        "id,email,created_at,profile_completed_at",
        "id,email,created_at",
      ],
      since90
    ),
    fetchPaged("generations", "user_id,created_at", since90),
    fetchPaged("content_items", "user_id,created_at", since90),
  ]);

if (!visitsPack.ready || !profilesPack.ready) {
  console.error(
    JSON.stringify(
      { siteVisits: visitsPack.error, profiles: profilesPack.error },
      null,
      2
    )
  );
  process.exit(1);
}

const activatedUserIds = new Set(
  [...generationsPack.rows, ...contentPack.rows]
    .map((row) => row.user_id)
    .filter(Boolean)
);
const windows = Object.fromEntries(
  WINDOWS.map((days) => [
    `${days}d`,
    summarizeWindow(
      days,
      visitsPack.rows,
      testsPack.rows,
      profilesPack.rows,
      activatedUserIds
    ),
  ])
);
const daily30d = buildDailySeries(
  visitsPack.rows,
  testsPack.rows,
  profilesPack.rows,
  30
);
const sumDaily = (rows, field) =>
  rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
const recent7Visitors = sumDaily(daily30d.slice(-7), "visitors");
const prior7Visitors = sumDaily(daily30d.slice(-14, -7), "visitors");
const trafficChangePct = prior7Visitors
  ? Math.round(((recent7Visitors - prior7Visitors) / prior7Visitors) * 1000) / 10
  : null;
const month = windows["30d"];
const naverSessions =
  month.channels.find((row) => row.id === "naver_organic")?.sessions || 0;
const naverSignups =
  month.acquiredSignups.find((row) => row.id === "naver_organic")?.signups || 0;
const socialSessions =
  month.channels.find((row) => row.id === "social")?.sessions || 0;

const report = {
  version: "acquisition-funnel-v1",
  generatedAt: new Date().toISOString(),
  source: "Supabase prod: site_visits + public_test_runs + profiles + generations + content_items",
  caveats: [
    "방문자는 고유 session_id 기준이며 내부·봇·다중 기기 방문이 일부 섞일 수 있습니다.",
    "가입자는 운영자·팀·자동화 테스트를 제외한 profiles 외부 유저 기준입니다.",
    "맛보기→가입은 동일 session_id 추적과 기간 내 외부 가입을 함께 보여 주며 완전한 코호트 인과는 아닙니다.",
    !testsPack.ready ? `public_test_runs unavailable: ${testsPack.error}` : null,
    visitsPack.truncated ? `site_visits truncated at ${MAX_ROWS} rows` : null,
  ].filter(Boolean),
  windows,
  daily30d,
  diagnosis: {
    recent7Visitors,
    prior7Visitors,
    trafficChangePct,
    monthlyVisitorToTestPct: month.visitorToTestPct,
    monthlyVisitorToSignupPct: month.visitorToSignupPct,
    monthlySignupToActivationPct: month.signupToActivationPct,
    naverOrganicSessions30d: naverSessions,
    naverOrganicSignups30d: naverSignups,
    naverOrganicSignupPct: pct(naverSignups, naverSessions),
    socialSessions30d: socialSessions,
    measuredCampaigns30d: month.topCampaigns.length,
  },
  promotionPlan: [
    {
      priority: "P0",
      action: "SNS 광범위 유입 집행을 줄이고 소재별 UTM을 의무화",
      reason: `최근 30일 SNS 세션 ${socialSessions}건이나 외부 가입 귀속은 0건이고 캠페인 식별값도 없습니다.`,
      successMetric: "캠페인별 방문→맛보기 8%+, 방문→가입 1%+",
    },
    {
      priority: "P0",
      action: "네이버 검색용 업종별 증거 콘텐츠 집중",
      reason: `최근 30일 네이버 검색 ${naverSessions}세션에서 유일한 외부 가입 ${naverSignups}건이 귀속됐습니다.`,
      successMetric: "네이버 유입 주 20세션, 검색 유입 가입률 2%+",
    },
    {
      priority: "P0",
      action: "랜딩 첫 화면에서 업종 선택→무료 결과까지 바로 연결",
      reason: `최근 30일 방문→맛보기 비율은 약 ${month.visitorToTestPct ?? 0}%입니다.`,
      successMetric: "방문→맛보기 8%+",
    },
    {
      priority: "P1",
      action: "맛보기 결과에 가입 후 얻는 월간 운영안을 명확히 제시",
      reason: `최근 30일 맛보기 ${month.publicTestUsers}명, 가입 의도 ${month.signupIntentUsers}명, 외부 가입 ${month.externalSignups}명입니다.`,
      successMetric: "맛보기→가입 의도 30%+, 의도→가입 30%+",
    },
    {
      priority: "P1",
      action: "가입 직후 초안 복원·첫 글 완료를 활성화 KPI로 관리",
      reason: `최근 30일 외부 가입 ${month.externalSignups}명 중 콘텐츠 활성화 ${month.activatedExternalSignups}명입니다.`,
      successMetric: "가입→첫 콘텐츠 60%+",
    },
  ],
  dataHealth: {
    trafficReady: visitsPack.ready,
    attributionSchema: String(visitsPack.select || "").includes("source_channel"),
    publicTestReady: testsPack.ready,
    profileAcquisitionSchema: String(profilesPack.select || "").includes(
      "acquisition_source_channel"
    ),
    generationsReady: generationsPack.ready,
    contentItemsReady: contentPack.ready,
    funnelSessionLinked:
      month.visitorToTestTrackedPct != null &&
      month.visitorToTestTrackedPct > 0,
  },
};

const output = resolve(root, "artifacts/acquisition-funnel/latest.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
console.error(`\nSaved: ${output}`);
