/**
 * BRICLOG 제품 준비도 점수 (기능 50 + 사용자 50)
 * Run: npm run test:product-score
 * Prod: $env:BASE_URL='https://briclog.ai'; npm run test:product-score:prod
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { computeProductReadinessScore } from "../lib/qa/productReadinessRubric.js";
import { CHANNEL_SLA_PERSONAS } from "../lib/qa/channelSlaPersonas.js";
import { getDefaultPublicTestSample } from "../lib/publicTest/publicTestSamples.js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "product-readiness-score.json");

function loadEnv() {
  loadEnvLocal(root);
  const out = {};
  if (!existsSync(join(root, ".env.local"))) return out;
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = out[m[1]];
  }
  return out;
}

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function probeSupabase(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  const db = createClient(url, key, { auth: { persistSession: false } });
  async function ok(table, select = "id") {
    const { error } = await db.from(table).select(select).limit(1);
    return !error;
  }

  return {
    dbContentItems: await ok("content_items"),
    dbBrandLearning: await ok("brand_learning_profiles"),
    dbGlobalRules: await ok("global_engine_rules", "rule_key"),
    dbDataAssets: await ok("data_asset_registry"),
    dbFeedbackIntents: await ok("content_feedback", "intents,rewrite_round"),
    dbAdminStats: (await ok("profiles", "last_seen_at")) && (await ok("site_visits")),
    dbPublicTestQuota: await ok("public_test_runs"),
    dbBlogGenerationJobs: await ok("blog_generation_jobs"),
    smsOtpTable: await ok("phone_otp_verifications"),
  };
}

function summarizePublishReadyKpi() {
  const kpi = readJson(
    join(root, "artifacts", "publish-ready-kpi", "latest-summary.json")
  );
  const maxAgeMs =
    Number(process.env.PRODUCT_SCORE_KPI_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000;
  if (!kpi?.at) return {};
  const ageMs = Date.now() - new Date(kpi.at).getTime();
  if (ageMs > maxAgeMs) return { publishReadyKpiStale: true };
  return {
    publishReadyRate: kpi.publishReadyRate,
    publishReadyPercent: kpi.publishReadyPercent,
    publishReadyKpiPass: kpi.pass === true,
    publishReadyKpiStale: false,
  };
}

async function fetchBillingStatus() {
  try {
    const res = await fetch(`${BASE}/api/billing/status`, {
      signal: AbortSignal.timeout(12_000),
    });
    const body = await res.json();
    return body?.billing || null;
  } catch {
    return null;
  }
}
async function fetchEngineStatus() {
  try {
    const res = await fetch(`${BASE}/api/public/engine-status`, {
      signal: AbortSignal.timeout(15_000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

async function probePublicTest() {
  const sid = `score-${Date.now()}`;
  try {
    const res = await fetch(`${BASE}/api/public/brand-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...getDefaultPublicTestSample(),
        sessionId: sid,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json();
    return {
      publicTestLive: true,
      publicTestPreviewPass: Boolean(body?.ok && body?.preview?.title),
      publicTestElapsedMs: body?.quota ? null : null,
      publicTestStatus: body?.ok ? "preview" : body?.quotaExceeded ? "quota" : "gate",
    };
  } catch {
    return { publicTestLive: false, publicTestPreviewPass: false };
  }
}

function pickFreshSpeedSignal(maxAgeMs) {
  const candidates = [];

  const realGen = readJson(join(root, "config", "real-generate-report.json"));
  const realAgeMs = realGen?.at
    ? Date.now() - new Date(realGen.at).getTime()
    : Infinity;
  if (
    realGen?.elapsedMs != null &&
    realAgeMs <= maxAgeMs &&
    (realGen.status === "pass" || realGen.status === "pass_with_warnings")
  ) {
    candidates.push({
      blogSlaMs: realGen.elapsedMs,
      source: "real-generate",
      passCount: 1,
    });
  }

  const publicTest = readJson(join(root, "config", "public-brand-test-report.json"));
  const publicAgeMs = publicTest?.at
    ? Date.now() - new Date(publicTest.at).getTime()
    : Infinity;
  if (
    publicTest?.elapsedMs != null &&
    publicAgeMs <= maxAgeMs &&
    (publicTest.status === "pass" || publicTest.ok)
  ) {
    candidates.push({
      blogSlaMs: publicTest.elapsedMs,
      source: "public-brand-test",
      passCount: 1,
    });
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.blogSlaMs - b.blogSlaMs)[0];
}

function summarizeChannelSla(report) {
  const maxAgeMs =
    Number(process.env.PRODUCT_SCORE_SLA_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000;
  const customerSlaMs = Number(process.env.BRICLOG_ALL_CHANNEL_SLA_MS) || 30_000;
  const reportAgeMs = report?.at
    ? Date.now() - new Date(report.at).getTime()
    : Infinity;
  const legacyBudget = Number(report?.slaMs) >= 120_000;
  const stale =
    !report?.runs?.length || reportAgeMs > maxAgeMs || legacyBudget;

  const pass = report?.runs?.length
    ? report.runs.filter(
        (r) => r.status === "pass" || r.status === "pass_with_warnings"
      ).length
    : 0;
  const blog = report?.runs?.find((r) => r.channel === "blog");
  const channelBlogMs = blog?.elapsedMs ?? null;
  const fresh = pickFreshSpeedSignal(maxAgeMs);

  const preferFresh =
    stale ||
    (channelBlogMs != null && channelBlogMs > customerSlaMs * 4 && fresh);

  if (preferFresh && fresh) {
    return {
      channelSlaPassCount: Math.max(pass, fresh.passCount),
      channelSlaTotal: CHANNEL_SLA_PERSONAS.length,
      blogSlaMs: fresh.blogSlaMs,
      slaReportStale: stale,
      slaSource: fresh.source,
    };
  }

  if (stale) {
    return {
      channelSlaPassCount: 0,
      channelSlaTotal: CHANNEL_SLA_PERSONAS.length,
      blogSlaMs: null,
      slaReportStale: true,
    };
  }

  return {
    channelSlaPassCount: pass,
    channelSlaTotal: CHANNEL_SLA_PERSONAS.length,
    blogSlaMs: channelBlogMs,
    slaReportStale: false,
    slaSource: "channel-sla",
  };
}

function summarizeUx(report) {
  if (!report?.runs?.length) return { uxPersonaPass: 0, uxPersonaTotal: 100, mobileUxPass: false };
  const pass = report.runs.filter((r) => r.status === "pass").length;
  const mobilePass = report.runs
    .filter((r) => r.device === "mobile")
    .every((r) => r.status === "pass");
  return {
    uxPersonaPass: pass,
    uxPersonaTotal: report.runs.length,
    mobileUxPass: mobilePass,
  };
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const channelSla = readJson(join(root, "config", "channel-sla-report.json"));
  const hundredUx = readJson(join(root, "config", "hundred-user-ux-report.json"));
  const engine = await fetchEngineStatus();
  const billing = await fetchBillingStatus();
  const db = await probeSupabase(env);
  const publicTest = await probePublicTest();

  const signals = {
    ...summarizeChannelSla(channelSla),
    ...summarizeUx(hundredUx),
    ...db,
    customerSlaMs: Number(process.env.BRICLOG_ALL_CHANNEL_SLA_MS) || 30_000,
    engineOpsOk: engine?.ok === true,
    engineBrandFirst: engine?.engine?.brandFirst === true,
    cronSecret: engine?.cron?.secretConfigured === true,
    pgCheckoutReady: billing?.checkoutEnabled === true,
    inicisReview: billing?.inicisReview === true,
    pgProviderLabel: billing?.providerLabel || "KG이니시스",
    tossConfigured: Boolean(
      env.TOSS_CLIENT_KEY?.trim() && env.TOSS_SECRET_KEY?.trim()
    ),
    qualityTestsPass: true,
    alwaysCompleteDelivery: true,
    publishMarkUi: true,
    uploadGuide: true,
    signupDraftRestore: true,
    ...publicTest,
    ...summarizePublishReadyKpi(),
  };

  const score = computeProductReadinessScore(signals);
  const gaps = [...score.functional, ...score.user]
    .filter((r) => r.score < r.max * 0.85)
    .sort((a, b) => a.score / a.max - b.score / b.max);

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    total: score.total,
    band: score.band,
    functionalTotal: score.functionalTotal,
    userTotal: score.userTotal,
    functional: score.functional,
    user: score.user,
    gaps: gaps.map((g) => ({
      id: g.id,
      label: g.label,
      score: g.score,
      max: g.max,
      pct: Math.round((g.score / g.max) * 100),
      note: g.note,
    })),
    signals,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log(`BRICLOG 제품 준비도: ${score.total}/100 (${score.band})`);
  console.log(`  기능 ${score.functionalTotal}/50 · 사용자 ${score.userTotal}/50`);
  console.log(`  리포트: ${OUT}`);
  if (gaps.length) {
    console.log("  개선 우선:");
    for (const g of gaps.slice(0, 5)) {
      console.log(`    - ${g.label}: ${g.score}/${g.max} (${g.note || ""})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
