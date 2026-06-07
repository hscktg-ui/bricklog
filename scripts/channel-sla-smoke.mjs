/**
 * 채널별 생성 SLA 스모크 (Playwright) — 목표: 클릭 후 180s 이내 결과 (CHANNEL_SLA_MS)
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

import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  createAuthenticatedContext,
  dismissWorkspaceModals,
  fillBlogFormViaDom,
  isWorkspaceReady,
} from "./lib/e2eAuth.js";

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

/** 리포트 JSON에 세션 토큰이 커밋되지 않도록 제거 */
function sanitizeSlaReport(report) {
  const out = JSON.parse(JSON.stringify(report));
  const login = out.login;
  if (!login) return out;
  if (login.token) login.token = "[redacted]";
  const session = login.session;
  if (!session) return out;
  if (session.tokenValue) session.tokenValue = "[redacted]";
  for (const origin of session.storageState?.origins || []) {
    for (const bucket of ["localStorage", "sessionStorage"]) {
      for (const item of origin[bucket] || []) {
        if (/auth|token/i.test(item.name || "")) item.value = "[redacted]";
      }
    }
  }
  return out;
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

async function openWorkspace(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  await page.waitForTimeout(2500);
  let ready = await isWorkspaceReady(page);
  if (!ready) {
    await page.waitForTimeout(3000);
    ready = await isWorkspaceReady(page);
  }
  return { ok: ready, reason: ready ? "supabase_session" : "workspace_missing" };
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
  await el.dispatchEvent("input").catch(() => null);
  await el.dispatchEvent("change").catch(() => null);
  await el.blur().catch(() => null);
  return true;
}

async function fillLabeledField(page, labelRe, value) {
  if (!value) return false;
  const el = page.getByLabel(labelRe).first();
  if (!(await el.count())) return false;
  await el.click();
  await el.fill("");
  await el.pressSequentially(value, { delay: 12 });
  await el.blur().catch(() => null);
  return true;
}

async function fillCommonFields(page, form) {
  let filled =
    (await fillLabeledField(page, /^브랜드명$/, form.brandName || "")) ||
    (await fillIfPresent(page, /매장·브랜드|브랜드|팀 이름/i, form.brandName || ""));

  filled =
    (await fillLabeledField(page, /^지역$/, form.region || "")) ||
    filled ||
    (await fillIfPresent(page, /파주|지역|예: 서울/i, form.region || ""));

  const topicFilled =
    (await fillLabeledField(page, /^오늘의 주제$/, form.topic || "")) ||
    (await fillIfPresent(page, /오늘 전하고|주제|이야기/i, form.topic || ""));

  if (!(topicFilled || filled)) {
    await fillBlogFormViaDom(page, form);
  } else {
    await page.waitForTimeout(400);
    await fillBlogFormViaDom(page, form);
  }
  await page.waitForTimeout(600);
}

async function waitForGenerateEnabled(page, timeoutMs = 15_000, pattern) {
  const re =
    pattern ||
    /조사 후 글 받기|구성안 만들기|이야기 쓰기|플레이스 소개글|인스타 초안|썸네일 문구|이미지 프롬프트/i;
  const btn = page.locator("button:not([disabled])").filter({ hasText: re }).first();
  await btn.waitFor({ state: "visible", timeout: timeoutMs });
  return btn;
}

async function waitForWorkspaceIdle(page, timeoutMs = 180_000) {
  await page
    .evaluate(() => {
      window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
    })
    .catch(() => null);
  await page
    .waitForFunction(
      () => {
        const t = document.body.innerText || "";
        if (/편집본 작성 중|조사해서 글 쓰는 중|올리기 전 점검|만드는 중…|쓰는 중/.test(t)) {
          return false;
        }
        const disabled = document.querySelector(
          'button[disabled]:not([aria-hidden="true"])'
        );
        if (disabled?.textContent?.includes("만드는 중")) return false;
        return true;
      },
      { timeout: timeoutMs }
    )
    .catch(() => null);
  await page.waitForTimeout(500);
}

async function resetWorkspaceBetweenRuns(page) {
  await waitForWorkspaceIdle(page, 180_000);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  await page.waitForTimeout(1200);
}

function uniqueSlaForm(form) {
  const stamp = String(Date.now()).slice(-6);
  return {
    ...form,
    brandName: form.brandName ? `${form.brandName}${stamp}` : form.brandName,
  };
}

async function ensureStandalone(page, channel) {
  const label = page.getByText(/단독으로 받기/i).first();
  if (!(await label.count())) return;
  const box = page.locator(`label:has-text("단독으로 받기") input[type="checkbox"]`).first();
  if (await box.count()) {
    const checked = await box.isChecked();
    if (!checked) await box.check({ force: true }).catch(() => null);
  }
}

async function waitForBlogResult(page, timeoutMs) {
  const genBtn = await waitForGenerateEnabled(
    page,
    15_000,
    /조사 후 글 받기|구성안 만들기|이야기 쓰기/i
  );
  const t0 = Date.now();

  const apiPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/content/blog") &&
        r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
      apiMs: Date.now() - t0,
    }))
    .catch((e) => ({ apiError: e.message }));

  await genBtn.click({ timeout: 10_000 });

  const apiSettled = await apiPromise;
  if (
    apiSettled.apiError ||
    apiSettled.body?.withheld ||
    apiSettled.body?.ok === false ||
    !apiSettled.body?.blogContent?.sections?.length
  ) {
    return {
      api: apiSettled,
      uiMs: Date.now() - t0,
      uiOk: false,
      uiError: apiSettled.body?.userMessage || apiSettled.apiError || "blog_api_no_content",
    };
  }

  const uiPromise = page.waitForFunction(
    () => {
      const t = document.body.innerText || "";
      if (t.includes("여기에 편집본이 채워집니다")) return false;
      if (t.includes("왼쪽 세 단계")) return false;
      if (/조사·편집 중|만드는 중|쓰는 중/.test(t) && !/전체 복사|발행 준비|편집본/.test(t)) {
        return false;
      }
      return (
        t.length > 400 &&
        (t.includes("복사") ||
          t.includes("발행") ||
          t.includes("편집본") ||
          t.includes("섹션") ||
          document.querySelector("article, [class*='result']"))
      );
    },
    { timeout: timeoutMs }
  );

  const uiOk = (await Promise.allSettled([uiPromise]))[0].status === "fulfilled";
  return {
    api: apiSettled,
    uiMs: Date.now() - t0,
    uiOk,
    uiError: uiOk ? null : "ui_result_timeout",
  };
}

async function waitForChannelResult(page, persona, timeoutMs) {
  const channelId =
    persona.channel === "insta"
      ? "instagram"
      : persona.channel === "image"
        ? "image"
        : persona.channel;

  const apiPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/content/channel") &&
        r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
    }))
    .catch((e) => ({ apiError: e.message }));

  const btn = page.getByRole("button", { name: persona.generatePattern }).first();
  await btn.scrollIntoViewIfNeeded().catch(() => null);
  await btn.click({ timeout: 10_000 });

  const hint = persona.resultHint;
  const uiPromise = page.waitForFunction(
    ({ re }) => {
      const t = document.body.innerText || "";
      if (/만드는 중|쓰는 중|준비 중|편집본 작성 중/.test(t)) return false;
      return new RegExp(re, "i").test(t);
    },
    { re: hint },
    { timeout: timeoutMs }
  );

  const [apiSettled, uiSettled] = await Promise.allSettled([apiPromise, uiPromise]);
  const api = apiSettled.status === "fulfilled" ? apiSettled.value : { apiError: apiSettled.reason?.message };
  const uiOk = uiSettled.status === "fulfilled";
  return { api, uiOk, channelId };
}

async function runPersona(page, persona, errors, networkFails, apiTrace) {
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
    const form = uniqueSlaForm(persona.form);
    await fillCommonFields(page, form);
    if (persona.form.placeHeadline) {
      await fillIfPresent(page, /헤드라인|한 줄/i, persona.form.placeHeadline);
    }
    if (persona.form.instaScene) {
      await fillIfPresent(page, /장면/i, persona.form.instaScene);
    }
    run.phases.fillMs = Date.now() - fillStart;

    try {
      await waitForGenerateEnabled(page, 12_000, persona.generatePattern);
    } catch {
      run.errors.push("generate_button_disabled");
      throw new Error("generate_button_disabled");
    }

    const remaining = CHANNEL_SLA_MS - (Date.now() - t0);
    if (remaining < 5000) throw new Error("setup_exceeded_sla");

    const genStart = Date.now();
    if (persona.channel === "blog") {
      const uncachedBlogOnly = page.locator('label:has-text("플레이스·인스타") input[type="checkbox"]');
      if (await uncachedBlogOnly.count()) {
        const checked = await uncachedBlogOnly.isChecked();
        if (checked) await uncachedBlogOnly.uncheck({ force: true }).catch(() => null);
      }
      const { api, uiMs, uiOk, uiError } = await waitForBlogResult(page, remaining);
      run.phases.api = api;
      run.phases.uiMs = uiMs;
      run.phases.uiOk = uiOk;
      if (!uiOk) {
        run.errors.push(uiError || "ui_result_timeout");
        throw new Error(uiError || "ui_result_timeout");
      }
      if (api.status && api.status >= 400) {
        run.errors.push(`blog_api_${api.status}`);
        run.network.push({ url: "/api/content/blog", status: api.status });
      }
      if (
        api.body?.withheld ||
        api.body?.ok === false ||
        !api.body?.blogContent?.sections?.length
      ) {
        run.status = "fail";
        run.errors.push(
          api.body?.userMessage || api.body?.error || "blog_api_no_content"
        );
        throw new Error("blog_api_no_content");
      }
    } else {
      const { api, uiOk } = await waitForChannelResult(page, persona, remaining);
      run.phases.api = api;
      run.phases.uiOk = uiOk;
      if (!uiOk) {
        run.errors.push("channel_ui_timeout");
        throw new Error("channel_ui_timeout");
      }
      const contentKey =
        persona.channel === "place"
          ? "placeContent"
          : persona.channel === "insta"
            ? "instagramContent"
            : "imagePrompts";
      if (api.status && api.status >= 400) {
        run.errors.push(`channel_api_${api.status}`);
        throw new Error(`channel_api_${api.status}`);
      }
      if (api.body?.withheld || api.body?.ok === false || !api.body?.[contentKey]) {
        run.status = "fail";
        run.errors.push(
          api.body?.userMessage || api.body?.error || "channel_api_no_content"
        );
        throw new Error("channel_api_no_content");
      }
    }
    run.phases.generateMs = Date.now() - genStart;
    run.elapsedMs = Date.now() - t0;
    run.phases.setupMs = run.elapsedMs - run.phases.generateMs;

    const blogApiCalled = apiTrace.some(
      (t) => t.url?.includes("/api/content/blog") && t.method === "POST"
    );
    run.phases.blogApiCalled = blogApiCalled;

    if (persona.channel === "blog" && run.phases.uiOk && !blogApiCalled) {
      run.warnings = [
        ...(run.warnings || []),
        "ui_without_blog_api_local_fallback",
      ];
    }

    if (run.phases.generateMs > CHANNEL_SLA_MS) {
      run.status = "fail";
      run.failReason = "sla_exceeded";
    } else if (run.status === "pass" && run.warnings?.length) {
      run.status = "pass_with_warnings";
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
  run.apiTrace = apiTrace.slice(-40);

  if (run.status === "fail") {
    run.pageSnippet = await page
      .evaluate(() => (document.body.innerText || "").slice(0, 1200))
      .catch(() => null);
  }

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
  const ctxResult = await createAuthenticatedContext(browser, BASE, {
    width: 1280,
    height: 900,
  });
  if (!ctxResult.ok) {
    console.error("Auth failed:", ctxResult.reason);
    process.exit(1);
  }

  const context = ctxResult.context;
  const page = await context.newPage();
  const consoleErrors = [];
  const networkFails = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const apiTrace = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      apiTrace.push({
        url: res.url().split("?")[0],
        status: res.status(),
        method: res.request().method(),
        at: Date.now(),
      });
      if (res.status() >= 400) {
        networkFails.push({ url: res.url(), status: res.status() });
      }
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

  report.login = {
    ...ctxResult.auth,
    ...(await openWorkspace(page)),
  };
  if (!report.login.ok) {
    report.summary = { skipped: true, reason: report.login.reason };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(sanitizeSlaReport(report), null, 2), "utf8");
    console.log("SKIP — workspace not ready:", report.login.reason);
    await browser.close();
    process.exit(1);
  }

  const limit = Number(process.env.CHANNEL_SLA_LIMIT) || 0;
  const personas =
    limit > 0 ? CHANNEL_SLA_PERSONAS.slice(0, limit) : CHANNEL_SLA_PERSONAS;

  const attachPageListeners = (p) => {
    p.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    p.on("response", (res) => {
      if (res.url().includes("/api/")) {
        apiTrace.push({
          url: res.url().split("?")[0],
          status: res.status(),
          method: res.request().method(),
          at: Date.now(),
        });
        if (res.status() >= 400) {
          networkFails.push({ url: res.url(), status: res.status() });
        }
      }
    });
  };

  attachPageListeners(page);

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const personaPage = i === 0 ? page : await context.newPage();
    if (i > 0) {
      attachPageListeners(personaPage);
      const login = await openWorkspace(personaPage);
      if (!login.ok) {
        report.runs.push({
          id: persona.id,
          status: "fail",
          failReason: "workspace_not_ready",
          errors: [login.reason],
        });
        await personaPage.close();
        continue;
      }
    }
    report.runs.push(
      await runPersona(
        personaPage,
        persona,
        consoleErrors,
        networkFails,
        apiTrace
      )
    );
    if (i > 0) await personaPage.close();
  }

  await browser.close();

  const passed = report.runs.filter(
    (r) => r.status === "pass" || r.status === "pass_with_warnings"
  );
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
  writeFileSync(OUT, JSON.stringify(sanitizeSlaReport(report), null, 2), "utf8");

  console.log(`\n=== CHANNEL SLA SMOKE (${Math.round(CHANNEL_SLA_MS / 1000)}s) ===\n`);
  console.log("Report:", OUT);
  for (const r of report.runs) {
    const mark =
      r.status === "pass" || r.status === "pass_with_warnings" ? "PASS" : "FAIL";
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
