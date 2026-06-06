/**
 * 실제 LLM 블로그 생성 E2E
 * - 기본(Playwright): prod UI → 조사·생성·결과 (channel-sla 블로그 1건)
 * - API_ONLY=1: /api/content/blog 직접 호출 (조사 미선행 시 research_gate 가능)
 *
 * Run: npm run test:real-generate
 * Prod: $env:BASE_URL='https://briclog.ai'; npm run test:real-generate:prod
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CHANNEL_SLA_MS, CHANNEL_SLA_PERSONAS } from "../lib/qa/channelSlaPersonas.js";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "http://localhost:3005").replace(/\/$/, "");
const OUT = join(root, "config", "real-generate-report.json");
const SLA_MS = Number(process.env.REAL_GENERATE_SLA_MS) || CHANNEL_SLA_MS;
const API_ONLY = process.env.API_ONLY === "1";

const SAMPLE = {
  brandName: "실측모닝브루",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
  storeFeatures: "수제 브런치",
  blogLengthTier: "short",
  writingSkillLevel: "civilian",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
  researchEnabled: true,
  researchMode: "v2_axis",
  skipAutoPipeline: true,
};

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
  applyE2eTestCredentialsToEnv(process.env);
}

function writeReport(report) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
}

function sectionChars(blog) {
  return (blog?.sections || [])
    .map((s) => String(s.body || "").replace(/\s/g, ""))
    .join("").length;
}

function extractPublishReady(body) {
  const meta = body?.meta || {};
  const blogMeta = body?.blogContent?._meta || {};
  return (
    blogMeta.publishReady === true ||
    blogMeta.aiEditorAudit?.publishReady === true ||
    blogMeta.primaryDirective?.publishReady === true ||
    meta.publishReady === true ||
    meta.aiEditorAudit?.publishReady === true
  );
}

async function runApiDirect() {
  const auth = await getE2eBearerToken();
  if (!auth.ok) {
    console.error("Auth failed:", auth.reason);
    process.exit(1);
  }

  const report = {
    at: new Date().toISOString(),
    mode: "api_direct",
    base: BASE,
    email: auth.email,
    slaMs: SLA_MS,
    input: SAMPLE,
    status: "fail",
    elapsedMs: null,
    httpStatus: null,
    responseMode: null,
    publishReady: false,
    pipelineVerified: false,
    sectionCount: 0,
    charCount: 0,
    errors: [],
    note: "클라이언트 조사(ensureBlogDelivery) 없이 API만 호출 — research_gate 가능",
  };

  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/content/blog`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(SAMPLE),
      signal: AbortSignal.timeout(SLA_MS + 30_000),
    });
  } catch (err) {
    report.elapsedMs = Date.now() - t0;
    report.errors.push(err.message);
    writeReport(report);
    process.exit(1);
  }

  report.elapsedMs = Date.now() - t0;
  report.httpStatus = res.status;
  const body = await res.json().catch(() => ({}));
  report.responseMode = body.mode;
  report.sectionCount = body.blogContent?.sections?.length || 0;
  report.charCount = sectionChars(body.blogContent);
  report.publishReady = extractPublishReady(body);
  report.pipelineVerified = Boolean(
    body.meta?.v2PipelineVerified || body.meta?.v3PipelineVerified
  );

  if (body.mode === "research_gate") {
    report.status = "gate_blocked";
    report.errors.push(body.userMessage || "research_gate");
  } else if (
    res.ok &&
    report.sectionCount >= 2 &&
    report.charCount >= 400 &&
    report.elapsedMs <= SLA_MS
  ) {
    report.status = "pass";
  } else {
    report.errors.push(
      body.userMessage || body.error || `sections=${report.sectionCount}`
    );
  }

  writeReport(report);
  printSummary(report);
  process.exit(
    report.status === "pass" || report.status === "pass_with_warnings" ? 0 : 1
  );
}

async function runPlaywright() {
  process.env.CHANNEL_SLA_LIMIT = "1";
  const { spawn } = await import("node:child_process");
  const script = join(__dirname, "channel-sla-smoke.mjs");
  const child = spawn(process.execPath, [script], {
    stdio: "inherit",
    env: { ...process.env, BASE_URL: BASE, CHANNEL_SLA_LIMIT: "1" },
    cwd: root,
  });
  const code = await new Promise((resolve) => {
    child.on("exit", (c) => resolve(c ?? 1));
  });

  const slaPath = join(root, "config", "channel-sla-report.json");
  let sla = null;
  try {
    sla = JSON.parse(readFileSync(slaPath, "utf8"));
  } catch {
    /* ignore */
  }

  const run = sla?.runs?.[0];
  const report = {
    at: new Date().toISOString(),
    mode: "playwright_ui",
    base: BASE,
    slaMs: SLA_MS,
    status:
      code === 0 &&
      (run?.status === "pass" || run?.status === "pass_with_warnings")
        ? run?.status === "pass_with_warnings"
          ? "pass_with_warnings"
          : "pass"
        : "fail",
    elapsedMs: run?.elapsedMs ?? null,
    persona: run?.id ?? "c_blog_cafe",
    publishReady: null,
    pipelineVerified: Boolean(run?.phases?.api?.body?.meta?.v2PipelineVerified),
    sectionCount: run?.phases?.api?.body?.blogContent?.sections?.length ?? null,
    charCount: run?.phases?.api?.body
      ? sectionChars(run.phases.api.body.blogContent)
      : null,
    apiStatus: run?.phases?.api?.status ?? null,
    errors: run?.errors ?? [],
    warnings: run?.warnings ?? [],
    blogApiCalled: run?.phases?.blogApiCalled ?? null,
    channelSlaReport: slaPath,
  };

  if (run?.phases?.api?.body) {
    report.publishReady = extractPublishReady(run.phases.api.body);
  }

  writeReport(report);
  printSummary(report);
  process.exit(
    report.status === "pass" || report.status === "pass_with_warnings" ? 0 : 1
  );
}

function printSummary(report) {
  console.log("\n=== REAL GENERATE SMOKE ===\n");
  console.log("Report:", OUT);
  console.log(`mode: ${report.mode}`);
  console.log(
    `[${String(report.status).toUpperCase()}]`,
    report.elapsedMs != null ? `${(report.elapsedMs / 1000).toFixed(1)}s` : "—"
  );
  if (report.sectionCount != null) {
    console.log(
      "sections:",
      report.sectionCount,
      "chars:",
      report.charCount,
      "publishReady:",
      report.publishReady
    );
  }
  if (report.errors?.length) console.log("errors:", report.errors.join("; "));
}

async function main() {
  loadEnvLocal();
  const probe = await fetch(BASE, { signal: AbortSignal.timeout(8000) }).catch(
    () => null
  );
  if (!probe?.ok) {
    console.error(`Server not reachable at ${BASE}`);
    process.exit(1);
  }

  if (API_ONLY) {
    await runApiDirect();
    return;
  }
  await runPlaywright();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
