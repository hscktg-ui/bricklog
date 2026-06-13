/**
 * 가입 전 브랜드 테스트 스모크
 * - API_ONLY=1: /api/public/brand-test 직접 호출
 * - 기본(Playwright): 랜딩 폼 → 생성 → 미리보기 또는 게이트 메시지
 *
 * Run: npm run test:public-brand-test
 * Prod: $env:BASE_URL='https://briclog.ai'; npm run test:public-brand-test:prod
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getDefaultPublicTestSample } from "../lib/publicTest/publicTestSamples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "http://localhost:3005").replace(/\/$/, "");
const OUT = join(root, "config", "public-brand-test-report.json");
const SLA_MS = Number(process.env.PUBLIC_TEST_SMOKE_SLA_MS) || 90_000;
const API_ONLY = process.env.API_ONLY === "1";

const DEFAULT_SAMPLE = getDefaultPublicTestSample();
const SAMPLE = {
  brandName: process.env.PUBLIC_TEST_BRAND || DEFAULT_SAMPLE.brandName,
  region: process.env.PUBLIC_TEST_REGION || DEFAULT_SAMPLE.region,
  topic: process.env.PUBLIC_TEST_TOPIC || DEFAULT_SAMPLE.topic,
  sampleId: process.env.PUBLIC_TEST_SAMPLE_ID || DEFAULT_SAMPLE.id,
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
}

function writeReport(report) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
}

function sessionId() {
  return `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function runApiSmoke() {
  const sid = sessionId();
  const started = Date.now();
  const report = {
    at: new Date().toISOString(),
    mode: "api",
    base: BASE,
    input: SAMPLE,
    sessionId: sid,
    slaMs: SLA_MS,
    status: "fail",
    elapsedMs: null,
    ok: false,
    hasPreview: false,
    gateFail: false,
    quotaExceeded: false,
    userMessage: null,
  };

  const quotaRes = await fetch(
    `${BASE}/api/public/brand-test?sessionId=${encodeURIComponent(sid)}`
  );
  const quotaBody = await quotaRes.json().catch(() => ({}));
  report.quotaGet = {
    status: quotaRes.status,
    remaining: quotaBody?.remaining,
    limited: quotaBody?.limited,
  };

  const res = await fetch(`${BASE}/api/public/brand-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...SAMPLE, sessionId: sid }),
    signal: AbortSignal.timeout(SLA_MS),
  });
  const body = await res.json().catch(() => ({}));
  report.elapsedMs = Date.now() - started;
  report.httpStatus = res.status;
  report.response = {
    ok: body?.ok,
    withheld: body?.withheld,
    quotaExceeded: body?.quotaExceeded,
    userMessage: body?.userMessage,
    previewTitle: body?.preview?.title || null,
    metrics: body?.metrics || null,
  };

  if (body?.quotaExceeded) {
    report.quotaExceeded = true;
    report.userMessage = body.userMessage;
    report.status = "quota";
    writeReport(report);
    console.log(JSON.stringify(report, null, 2));
    console.error("FAIL: quota exceeded");
    process.exit(1);
  }

  if (body?.ok && body?.preview?.title) {
    report.ok = true;
    report.hasPreview = true;
    report.status = "pass";
    writeReport(report);
    console.log("PASS: public brand test preview", report.elapsedMs, "ms");
    return;
  }

  if (!body?.ok && body?.userMessage) {
    report.gateFail = true;
    report.userMessage = body.userMessage;
    report.status = "gate_fail";
    writeReport(report);
    console.log("PASS (gate):", body.userMessage, report.elapsedMs, "ms");
    return;
  }

  writeReport(report);
  console.error("FAIL: unexpected response", body);
  process.exit(1);
}

async function runUiSmoke() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const started = Date.now();
  const report = {
    at: new Date().toISOString(),
    mode: "ui",
    base: BASE,
    input: SAMPLE,
    slaMs: SLA_MS,
    status: "fail",
    elapsedMs: null,
    ok: false,
    hasPreview: false,
    gateFail: false,
    userMessage: null,
  };

  try {
    await page.goto(`${BASE}/?skipIntro=1#public-brand-test`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForSelector("#public-brand-test form", { timeout: 30_000 });

    const form = page.locator("#public-brand-test form");
    const inputs = form.locator("input").filter({ hasNot: form.locator("[type=hidden]") });
    await inputs.nth(0).fill(SAMPLE.brandName);
    await inputs.nth(1).fill(SAMPLE.region);
    await inputs.nth(2).fill(SAMPLE.topic);

    const submit = form.locator('button[type="submit"]').first();
    await submit.waitFor({ state: "visible", timeout: 15_000 });
    await submit.click();

    const preview = page.getByText("발행 가능 샘플");
    const errorLine = form.locator("p").filter({ hasText: /다시|구체|입력|시도|무료 테스트를 모두/ });

    await Promise.race([
      preview.waitFor({ state: "visible", timeout: SLA_MS }),
      errorLine.waitFor({ state: "visible", timeout: SLA_MS }),
    ]);

    report.elapsedMs = Date.now() - started;

    if (await preview.isVisible().catch(() => false)) {
      report.ok = true;
      report.hasPreview = true;
      report.status = "pass";
      writeReport(report);
      console.log("PASS: UI preview", report.elapsedMs, "ms");
      return;
    }

    const errText = (await errorLine.first().textContent().catch(() => ""))?.trim();
    if (errText) {
      report.gateFail = true;
      report.userMessage = errText;
      report.status = "gate_fail";
      writeReport(report);
      console.log("PASS (gate UI):", errText, report.elapsedMs, "ms");
      return;
    }

    writeReport(report);
    console.error("FAIL: no preview or gate message");
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  if (API_ONLY) {
    await runApiSmoke();
    return;
  }
  await runUiSmoke();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
