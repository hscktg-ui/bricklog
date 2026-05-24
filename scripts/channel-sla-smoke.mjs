/**
 * 채널별 생성 SLA 스모크 (Playwright) — 목표: 클릭 후 120s 이내 결과
 * Run: npm run test:channel-sla
 * Env: BASE_URL, BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD (.env.local)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CHANNEL_SLA_MS,
  CHANNEL_SLA_PERSONAS,
} from "../lib/qa/channelSlaPersonas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "channel-sla-report.json");

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

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return;
  const skip = page.locator('[data-briclog-intro-skip="1"]');
  if (await skip.count()) await skip.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(400);
}

async function dismissWelcome(page) {
  const welcome = page.getByRole("button", { name: /건너뛰기|시작하기/i });
  if (await welcome.count()) {
    await welcome.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
}

async function login(page) {
  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;
  if (!email || !password) return { ok: false, reason: "no_credentials" };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissIntro(page);

  const start = page.locator('[data-briclog-cta="start"]').first();
  if (await start.count()) {
    await start.click({ timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(500);
  }

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^로그인$/i }).last().click();
  await page.waitForTimeout(4000);
  await dismissWelcome(page);

  const inApp = await page
    .getByPlaceholder(/매장·브랜드|브랜드/i)
    .first()
    .count()
    .catch(() => 0);
  return { ok: inApp > 0, reason: inApp > 0 ? "ok" : "login_failed" };
}

async function openChannel(page, menuPattern) {
  const btn = page.getByRole("button", { name: menuPattern }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(600);
  }
}

async function fillIfPresent(page, placeholderRe, value) {
  const el = page.getByPlaceholder(placeholderRe).first();
  if (!(await el.count())) return false;
  await el.fill(value);
  return true;
}

async function fillCommonFields(page, form) {
  await fillIfPresent(page, /매장·브랜드|브랜드/i, form.brandName || "");
  await fillIfPresent(page, /파주|지역/i, form.region || "");
  const topic = page
    .getByPlaceholder(/오늘 전하고|주제|이야기/i)
    .first();
  if (await topic.count()) {
    await topic.fill(form.topic || "");
  }
}

async function ensureStandalone(page, channel) {
  const label = page.getByText(/단독으로 만들기/i).first();
  if (!(await label.count())) return;
  const box = page.locator(`label:has-text("단독으로 만들기") input[type="checkbox"]`).first();
  if (await box.count()) {
    const checked = await box.isChecked();
    if (!checked) await box.check({ force: true }).catch(() => null);
  }
}

async function waitForBlogResult(page, timeoutMs) {
  const apiPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/content/blog") &&
        r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      apiMs: null,
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
    }))
    .catch((e) => ({ apiError: e.message }));

  await page
    .getByRole("button", { name: /이야기 쓰기|구성안 만들기/i })
    .first()
    .click({ timeout: 10_000 });

  const api = await apiPromise;
  const uiStart = Date.now();
  await page.waitForFunction(
    () => {
      const t = document.body.innerText || "";
      if (t.includes("여기에 이야기가 채워집니다")) return false;
      if (t.includes("왼쪽 세 단계")) return false;
      return (
        t.length > 800 &&
        (t.includes("복사") ||
          t.includes("섹션") ||
          document.querySelector("article, [class*='result']"))
      );
    },
    { timeout: timeoutMs }
  );
  return { api, uiMs: Date.now() - uiStart };
}

async function waitForChannelResult(page, persona, timeoutMs) {
  await page
    .getByRole("button", { name: persona.generatePattern })
    .first()
    .click({ timeout: 10_000 });

  const hint = persona.resultHint;
  await page.waitForFunction(
    ({ re }) => {
      const t = document.body.innerText || "";
      if (/만드는 중|쓰는 중|준비 중/.test(t) && !new RegExp(re, "i").test(t)) {
        return false;
      }
      return new RegExp(re, "i").test(t) || t.length > 600;
    },
    { re: hint },
    { timeout: timeoutMs }
  );
}

async function runPersona(page, persona, errors, networkFails) {
  const run = {
    id: persona.id,
    channel: persona.channel,
    label: persona.label,
    slaMs: CHANNEL_SLA_MS,
    status: "pass",
    elapsedMs: null,
    phases: {},
    errors: [],
    network: [],
  };

  const t0 = Date.now();
  try {
    await openChannel(page, persona.menuPattern);
    run.phases.navigateMs = Date.now() - t0;

    if (persona.preferStandalone) {
      await ensureStandalone(page, persona.channel);
    }

    const fillStart = Date.now();
    await fillCommonFields(page, persona.form);
    if (persona.form.placeHeadline) {
      await fillIfPresent(page, /헤드라인|한 줄/i, persona.form.placeHeadline);
    }
    if (persona.form.instaScene) {
      await fillIfPresent(page, /장면/i, persona.form.instaScene);
    }
    run.phases.fillMs = Date.now() - fillStart;

    const remaining = CHANNEL_SLA_MS - (Date.now() - t0);
    if (remaining < 5000) throw new Error("setup_exceeded_sla");

    const genStart = Date.now();
    if (persona.channel === "blog") {
      const uncachedBlogOnly = page.locator('label:has-text("플레이스·인스타") input[type="checkbox"]');
      if (await uncachedBlogOnly.count()) {
        const checked = await uncachedBlogOnly.isChecked();
        if (checked) await uncachedBlogOnly.uncheck({ force: true }).catch(() => null);
      }
      const { api, uiMs } = await waitForBlogResult(page, remaining);
      run.phases.api = api;
      run.phases.uiAfterApiMs = uiMs;
      if (api.status && api.status >= 400) {
        run.errors.push(`blog_api_${api.status}`);
        run.network.push({ url: "/api/content/blog", status: api.status });
      }
      if (api.body?.mode === "error" || api.body?.ok === false) {
        run.errors.push(api.body?.userMessage || api.body?.error || "blog_api_error");
      }
    } else {
      await waitForChannelResult(page, persona, remaining);
    }
    run.phases.generateMs = Date.now() - genStart;
    run.elapsedMs = Date.now() - t0;

    if (run.elapsedMs > CHANNEL_SLA_MS) {
      run.status = "fail";
      run.failReason = "sla_exceeded";
    }
  } catch (err) {
    run.elapsedMs = Date.now() - t0;
    run.status = "fail";
    run.failReason = err.message;
    run.errors.push(err.message);
  }

  run.consoleErrors = errors.slice(-20);
  run.networkFails = networkFails.filter((n) =>
    n.url?.includes("/api/")
  ).slice(-15);

  return run;
}

async function main() {
  loadEnvLocal();

  const probe = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).catch(
    () => null
  );
  if (!probe?.ok) {
    console.error(`Server not reachable at ${BASE} — run: npm run dev:3005`);
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("briclog-intro-session-done", "1");
    } catch {
      /* ignore */
    }
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const networkFails = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      networkFails.push({ url: res.url(), status: res.status() });
    }
  });

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    slaMs: CHANNEL_SLA_MS,
    login: null,
    runs: [],
    summary: {},
  };

  report.login = await login(page);
  if (!report.login.ok) {
    report.summary = { skipped: true, reason: report.login.reason };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
    console.log("SKIP — set BRICLOG_TEST_EMAIL/PASSWORD in .env.local");
    await browser.close();
    process.exit(0);
  }

  for (const persona of CHANNEL_SLA_PERSONAS) {
    report.runs.push(await runPersona(page, persona, consoleErrors, networkFails));
  }

  await browser.close();

  const passed = report.runs.filter((r) => r.status === "pass");
  const failed = report.runs.filter((r) => r.status === "fail");
  report.summary = {
    total: report.runs.length,
    passed: passed.length,
    failed: failed.length,
    withinSla: passed.map((r) => r.id),
    overSlaOrError: failed.map((r) => ({
      id: r.id,
      elapsedMs: r.elapsedMs,
      failReason: r.failReason,
      errors: r.errors,
    })),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== CHANNEL SLA SMOKE (2min) ===\n");
  console.log("Report:", OUT);
  for (const r of report.runs) {
    const mark = r.status === "pass" ? "PASS" : "FAIL";
    console.log(
      `[${mark}] ${r.id} — ${(r.elapsedMs / 1000).toFixed(1)}s`,
      r.failReason || "",
      r.errors?.length ? `errors: ${r.errors.join("; ")}` : ""
    );
    if (r.phases?.api) {
      console.log("       api:", JSON.stringify(r.phases.api));
    }
  }
  console.log("\nSummary:", report.summary);

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
