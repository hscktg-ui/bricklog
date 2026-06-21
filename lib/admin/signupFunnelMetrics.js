import { startOfTodayKstIso, daysAgoIso } from "@/lib/admin/kstTime";
import {
  countUniqueSessionsSince,
  signupConversionPct,
} from "@/lib/admin/memberCountAudit";
import {
  SIGNUP_FUNNEL_PATH_PREFIX,
  SIGNUP_INTENT_PATH_PREFIX,
  LOGIN_FAIL_PATH_PREFIX,
  LOGIN_INTENT_PATH_PREFIX,
} from "@/lib/analytics/signupIntent";
import { labelLoginSource, labelSignupSource } from "@/lib/admin/ctaSourceLabels";

const ROW_LIMIT = 5000;

function bump(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function topEntries(map, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function withSignupLabels(rows = []) {
  return rows.map((row) => ({
    ...row,
    displayLabel: labelSignupSource(row.label),
  }));
}

function withLoginLabels(rows = []) {
  return rows.map((row) => ({
    ...row,
    displayLabel: labelLoginSource(row.label),
  }));
}

export function parseSignupIntentPath(path = "") {
  const raw = String(path || "");
  if (!raw.startsWith(SIGNUP_INTENT_PATH_PREFIX)) return null;
  return raw.slice(SIGNUP_INTENT_PATH_PREFIX.length) || "unknown";
}

export function parseLoginIntentPath(path = "") {
  const raw = String(path || "");
  if (!raw.startsWith(LOGIN_INTENT_PATH_PREFIX)) return null;
  return raw.slice(LOGIN_INTENT_PATH_PREFIX.length) || "unknown";
}

export function parseLoginFailPath(path = "") {
  const raw = String(path || "");
  if (!raw.startsWith(LOGIN_FAIL_PATH_PREFIX)) return null;
  const rest = raw.slice(LOGIN_FAIL_PATH_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon < 0) return { code: rest || "unknown", source: "unknown" };
  return {
    code: rest.slice(0, colon) || "unknown",
    source: rest.slice(colon + 1) || "unknown",
  };
}

export function parseSignupFunnelPath(path = "") {
  const raw = String(path || "");
  if (!raw.startsWith(SIGNUP_FUNNEL_PATH_PREFIX)) return null;
  const rest = raw.slice(SIGNUP_FUNNEL_PATH_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon < 0) return { step: rest, source: "unknown" };
  return {
    step: rest.slice(0, colon),
    source: rest.slice(colon + 1) || "unknown",
  };
}

function aggregateIntentRows(rows = []) {
  const bySource = {};
  for (const row of rows) {
    const source = parseSignupIntentPath(row.path) || "unknown";
    bump(bySource, source);
  }
  const total = rows.length;
  return { total, bySource, topSources: withSignupLabels(topEntries(bySource)) };
}

function aggregateFunnelRows(rows = []) {
  const byStep = {};
  const bySource = {};
  for (const row of rows) {
    const parsed = parseSignupFunnelPath(row.path);
    if (!parsed) continue;
    bump(byStep, parsed.step);
    bump(bySource, parsed.source);
  }
  return {
    byStep,
    modalOpen: byStep.modal_open || 0,
    formSubmit: byStep.form_submit || 0,
    signupSuccess: byStep.signup_success || 0,
    topSources: topEntries(bySource),
  };
}

async function fetchPathRows(db, sinceIso, likePattern) {
  const { data, error } = await db
    .from("site_visits")
    .select("path")
    .gte("created_at", sinceIso)
    .like("path", likePattern)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (error) return { rows: [], error: error.message, truncated: false };
  return {
    rows: data || [],
    error: null,
    truncated: (data || []).length >= ROW_LIMIT,
  };
}

async function periodFunnelMetrics(db, sinceIso) {
  const [
    uniquePack,
    intentCountRes,
    intentRowsPack,
    funnelRowsPack,
    signupsRes,
    completedRes,
    incompleteRes,
  ] = await Promise.all([
    countUniqueSessionsSince(db, sinceIso),
    db
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .like("path", `${SIGNUP_INTENT_PATH_PREFIX}%`),
    fetchPathRows(db, sinceIso, `${SIGNUP_INTENT_PATH_PREFIX}%`),
    fetchPathRows(db, sinceIso, `${SIGNUP_FUNNEL_PATH_PREFIX}%`),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .not("profile_completed_at", "is", null),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .is("profile_completed_at", null),
  ]);

  const uniqueVisitors = uniquePack.count;
  const signupIntents =
    intentCountRes.error ? intentRowsPack.rows.length : intentCountRes.count ?? 0;
  const intents = aggregateIntentRows(intentRowsPack.rows);
  const funnel = aggregateFunnelRows(funnelRowsPack.rows);
  const signups = signupsRes.error ? null : signupsRes.count ?? 0;
  const profileCompleted = completedRes.error ? null : completedRes.count ?? 0;

  return {
    uniqueVisitors,
    uniqueVisitorsTruncated: uniquePack.truncated === true,
    signupIntents,
    intentBySource: intents.topSources,
    funnel,
    signups,
    profileCompleted,
    incompleteProfiles: incompleteRes.error ? null : incompleteRes.count ?? 0,
    rates: {
      visitorToIntentPct: signupConversionPct(signupIntents, uniqueVisitors),
      intentToModalPct: signupConversionPct(funnel.modalOpen, signupIntents),
      modalToSubmitPct: signupConversionPct(funnel.formSubmit, funnel.modalOpen),
      submitToSignupPct: signupConversionPct(signups, funnel.formSubmit),
      intentToSignupPct: signupConversionPct(signups, signupIntents),
      visitorToSignupPct: signupConversionPct(signups, uniqueVisitors),
    },
    truncated:
      intentRowsPack.truncated ||
      funnelRowsPack.truncated ||
      uniquePack.truncated === true,
    errors: [
      uniquePack.error,
      intentCountRes.error?.message,
      intentRowsPack.error,
      funnelRowsPack.error,
      signupsRes.error?.message,
    ].filter(Boolean),
  };
}

function aggregateLoginIntentRows(rows = []) {
  const bySource = {};
  for (const row of rows) {
    const source = parseLoginIntentPath(row.path) || "unknown";
    bump(bySource, source);
  }
  return {
    attempts: rows.length,
    bySource,
    topSources: withLoginLabels(topEntries(bySource)),
  };
}

function aggregateLoginFailRows(rows = []) {
  const byReason = {};
  const bySource = {};
  for (const row of rows) {
    const parsed = parseLoginFailPath(row.path);
    if (!parsed) continue;
    bump(byReason, parsed.code);
    bump(bySource, parsed.source);
  }
  return {
    failures: rows.length,
    byReason: topEntries(byReason),
    bySource: withLoginLabels(topEntries(bySource)),
  };
}

async function periodLoginMetrics(db, sinceIso) {
  const [intentPack, failPack] = await Promise.all([
    fetchPathRows(db, sinceIso, `${LOGIN_INTENT_PATH_PREFIX}%`),
    fetchPathRows(db, sinceIso, `${LOGIN_FAIL_PATH_PREFIX}%`),
  ]);

  const intents = aggregateLoginIntentRows(intentPack.rows);
  const fails = aggregateLoginFailRows(failPack.rows);

  return {
    loginAttempts: intents.attempts,
    loginFailures: fails.failures,
    intentBySource: intents.topSources,
    failByReason: fails.byReason,
    failBySource: fails.bySource,
    failRatePct: signupConversionPct(fails.failures, intents.attempts),
    truncated: intentPack.truncated || failPack.truncated,
    errors: [intentPack.error, failPack.error].filter(Boolean),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function fetchSignupFunnelMetrics(db) {
  const todayIso = startOfTodayKstIso();
  const since7d = daysAgoIso(7);

  const [today, last7d, loginToday, login7d] = await Promise.all([
    periodFunnelMetrics(db, todayIso),
    periodFunnelMetrics(db, since7d),
    periodLoginMetrics(db, todayIso),
    periodLoginMetrics(db, since7d),
  ]);

  return {
    asOf: new Date().toISOString(),
    todayStartKst: todayIso,
    today,
    last7d,
    login: {
      today: loginToday,
      last7d: login7d,
    },
    hints: [
      "순방문 = site_visits 고유 session_id",
      "가입 CTA = __intent/signup:* 클릭",
      "로그인 시도 = __intent/login:* · 실패 = __funnel/login_fail:코드:출처",
      "퍼널 단계 = __funnel/signup:단계:출처 (모달·제출·완료)",
      "가입 완료 = profiles 신규 생성 (KST 구간)",
    ],
  };
}
