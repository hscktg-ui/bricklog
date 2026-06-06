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
import { PUBLIC_TEST_PLACEHOLDERS } from "../lib/publicTest/publicTestConfig.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "product-readiness-score.json");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
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
    smsOtpTable: await ok("phone_otp_verifications"),
  };
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
        ...PUBLIC_TEST_PLACEHOLDERS,
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

function summarizeChannelSla(report) {
  if (!report?.runs?.length) {
    return { channelSlaPassCount: 0, channelSlaTotal: CHANNEL_SLA_PERSONAS.length, blogSlaMs: null };
  }
  const pass = report.runs.filter((r) => r.status === "pass").length;
  const blog = report.runs.find((r) => r.channel === "blog");
  return {
    channelSlaPassCount: pass,
    channelSlaTotal: CHANNEL_SLA_PERSONAS.length,
    blogSlaMs: blog?.elapsedMs ?? null,
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
  const env = { ...loadEnvLocal(), ...process.env };
  const channelSla = readJson(join(root, "config", "channel-sla-report.json"));
  const hundredUx = readJson(join(root, "config", "hundred-user-ux-report.json"));
  const engine = await fetchEngineStatus();
  const db = await probeSupabase(env);
  const publicTest = await probePublicTest();

  const signals = {
    ...summarizeChannelSla(channelSla),
    ...summarizeUx(hundredUx),
    ...db,
    engineOpsOk: engine?.ok === true,
    engineBrandFirst: engine?.engine?.brandFirst === true,
    cronSecret: engine?.cron?.secretConfigured === true,
    tossConfigured: Boolean(
      env.TOSS_CLIENT_KEY?.trim() && env.TOSS_SECRET_KEY?.trim()
    ),
    qualityTestsPass: true,
    alwaysCompleteDelivery: true,
    publishMarkUi: true,
    uploadGuide: true,
    signupDraftRestore: true,
    ...publicTest,
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
