/**
 * 꼼꼼한 신규 회원 — 랜딩 → 가입 → 브랜드 → 채널별 제작 (Playwright + prod API)
 * Run: BASE_URL=https://briclog.ai node --import ./scripts/register-alias.mjs scripts/meticulous-new-user-journey.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  dismissWorkspaceModals,
  fillBlogFormViaDom,
  fillChannelFormViaDom,
  ensureSmokeBrand,
  installE2eAuthRequestBridge,
  waitForWorkspaceReady,
  createAuthenticatedContext,
  syncE2eSessionToPage,
} from "./lib/e2eAuth.js";
import { ensureE2eTestUser } from "./ensure-e2e-test-user.mjs";

function ensureJourneyUser(email, password) {
  const tail = email.split("@")[0].replace(/\D/g, "").slice(-6) || "user";
  return ensureE2eTestUser({
    email,
    password,
    nickname: `꼼꼼${tail}`,
  });
}

function saveReport(report) {
  report.updatedAt = new Date().toISOString();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
}

function parseChannelFilter() {
  const raw = process.env.METICULOUS_CHANNELS || "";
  if (!raw.trim()) return null;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

async function waitForGenerationResult(page, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await page.evaluate(() => {
      const t = document.body.innerText || "";
      const loading = /편집본 작성 중|조사해서 글 쓰는 중|만드는 중|쓰는 중/.test(t);
      const placeholder = t.includes("여기에 편집본이 채워집니다");
      const article = document.querySelector("article");
      const articleText = (article?.innerText || "").trim();
      return {
        loading,
        placeholder,
        articleChars: articleText.replace(/\s/g, "").length,
        bodyChars: t.replace(/\s/g, "").length,
      };
    });
    if (!state.loading && !state.placeholder && (state.articleChars > 80 || state.bodyChars > 200)) {
      return { ok: true, state, waitedMs: Date.now() - started };
    }
    const sec = Math.round((Date.now() - started) / 1000);
    if (sec > 0 && sec % 30 === 0) {
      console.log(`    … 생성 대기 ${sec}s (loading=${state.loading}, article=${state.articleChars}자)`);
    }
    await page.waitForTimeout(2000);
  }
  const state = await page.evaluate(() => {
    const t = document.body.innerText || "";
    const article = document.querySelector("article");
    return {
      articleChars: ((article?.innerText || "").trim()).replace(/\s/g, "").length,
      bodyChars: t.replace(/\s/g, "").length,
      snippet: t.slice(0, 200),
    };
  });
  return { ok: false, state, waitedMs: Date.now() - started };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "meticulous-new-user-journey-report.json");
const CHANNEL_SLA_MS = Number(process.env.CHANNEL_SLA_MS) || 240_000;
const BLOG_SLA_MS = Number(process.env.BLOG_SLA_MS) || 360_000;

const BRAND = {
  brandName: "꼼꼼감사카페",
  region: "서울 강남",
  topic: "봄 시즌 쌀빵 신메뉴 오픈",
  industry: "카페",
  placeHeadline: "쌀빵 신메뉴",
  instaScene: "매장 테이블 촬영",
};

const CHANNELS = [
  {
    id: "blog",
    label: "이야기",
    menuPattern: /이야기/,
    generatePattern: /조사 후 글 받기|구성안 만들기|이야기 쓰기/,
    standalone: false,
  },
  {
    id: "place",
    label: "플레이스",
    menuPattern: /플레이스/,
    generatePattern: /플레이스 소개글 만들기/,
    standalone: true,
  },
  {
    id: "insta",
    label: "인스타",
    menuPattern: /인스타/,
    generatePattern: /인스타 캡션·해시태그 만들기/,
    standalone: true,
  },
  {
    id: "image",
    label: "썸네일",
    menuPattern: /썸네일/,
    generatePattern: /썸네일 문구 만들기/,
    standalone: true,
  },
];

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

function pushStep(report, phase, step, ok, detail = null) {
  const entry = { phase, step, ok, ...(detail != null ? { detail } : {}) };
  report.steps.push(entry);
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} [${phase}] ${step}${detail != null ? ` — ${JSON.stringify(detail)}` : ""}`);
  if (!ok) report.status = report.status === "pass" ? "partial" : report.status;
}

async function dismissIntro(page) {
  for (let i = 0; i < 8; i++) {
    const intro = page.locator('[aria-label="BRICLOG 소개"]');
    if (!(await intro.count())) {
      await page.waitForTimeout(400);
      if (!(await intro.count())) return "absent";
    }
    const skip = page.locator('[data-briclog-intro-skip="1"]');
    if (await skip.count()) {
      await skip.click({ timeout: 5000 }).catch(() => null);
    } else {
      await page.getByRole("button", { name: /시작|바로/i }).first().click({ timeout: 5000 }).catch(() => null);
    }
    await page.waitForTimeout(600);
    if (!(await intro.count())) return "dismissed";
  }
  return (await page.locator('[aria-label="BRICLOG 소개"]').count()) ? "still_open" : "dismissed";
}

async function runGuestLanding(page, report) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1200);
  const intro = await dismissIntro(page);
  pushStep(report, "guest", "intro_dismiss", intro !== "still_open", intro);

  const heroTest = page.locator('[data-briclog-cta="test"]').first();
  pushStep(report, "guest", "hero_test_cta", (await heroTest.count()) > 0);

  const signupLink = page.getByRole("button", { name: "바로 가입하기" });
  pushStep(report, "guest", "signup_entry_visible", (await signupLink.count()) > 0);

  return (await heroTest.count()) > 0 || (await signupLink.count()) > 0;
}

async function openSignupModal(page) {
  const signupEntry = page.getByRole("button", { name: "바로 가입하기" });
  if (await signupEntry.count()) {
    await signupEntry.first().scrollIntoViewIfNeeded().catch(() => null);
    await signupEntry.first().click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: "로그인" }).first().click({ timeout: 10_000 });
    await page.getByRole("button", { name: "회원가입" }).first().click({ timeout: 10_000 });
  }
  await page.getByRole("heading", { name: "회원가입" }).waitFor({ timeout: 20_000 });
}

async function waitForEmailCheckIdle(page) {
  await page
    .waitForFunction(
      () => {
        const nodes = [...document.querySelectorAll('[role="status"]')];
        if (!nodes.length) return true;
        return !nodes.some((n) => (n.textContent || "").includes("확인 중"));
      },
      undefined,
      { timeout: 20_000 }
    )
    .catch(() => null);
  await page.waitForTimeout(500);
}

async function runUiSignup(page, report, email, password) {
  await dismissIntro(page);

  await openSignupModal(page);
  pushStep(report, "signup", "auth_modal_open", true);

  await page.locator("#auth-email").fill("");
  await page.locator("#auth-email").pressSequentially(email, { delay: 35 });
  await waitForEmailCheckIdle(page);

  const emailStatus = await page
    .locator('[role="status"]')
    .first()
    .textContent()
    .catch(() => "");
  const emailOk = !/이미 가입|사용할 수 없/i.test(emailStatus || "");
  pushStep(report, "signup", "email_available", emailOk, emailStatus?.trim()?.slice(0, 80) || null);
  if (!emailOk) throw new Error("email_not_available");

  await page.locator("#auth-password").fill(password);

  const terms = page
    .locator("label")
    .filter({ hasText: /동의 \(필수\)/ })
    .locator('input[type="checkbox"]');
  if (await terms.count()) {
    await page.locator("label").filter({ hasText: /동의 \(필수\)/ }).first().click();
  }
  pushStep(report, "signup", "terms_checked", true);

  await page
    .waitForFunction(
      () => {
        const form = document.querySelector("#auth-email")?.closest("form");
        const btn = form?.querySelector('button[type="submit"]');
        return Boolean(btn && !btn.disabled);
      },
      undefined,
      { timeout: 35_000 }
    )
    .catch(() => null);

  const submit = page
    .locator("form")
    .filter({ has: page.locator("#auth-email") })
    .locator('button[type="submit"]');
  const stillDisabled = await submit.isDisabled().catch(() => true);
  pushStep(report, "signup", "submit_enabled", !stillDisabled);
  if (stillDisabled) throw new Error("signup_submit_still_disabled");

  await submit.click({ timeout: 15_000 });
  pushStep(report, "signup", "submit_clicked", true);

  await page.waitForFunction(
    () =>
      Boolean(
        document.querySelector(".briclog-workspace-header") ||
          document.querySelector('nav[aria-label="작업 메뉴"]') ||
          document.querySelector('[data-briclog-generate="blog"]')
      ),
    undefined,
    { timeout: 60_000 }
  ).catch(() => null);

  const inWorkspace = await page.evaluate(() =>
    Boolean(
      document.querySelector(".briclog-workspace-header") ||
        document.querySelector('nav[aria-label="작업 메뉴"]')
    )
  );
  pushStep(report, "signup", "workspace_after_signup", inWorkspace);

  await dismissWorkspaceModals(page);
  const ready = await waitForWorkspaceReady(page, 45_000);
  pushStep(report, "signup", "workspace_ready", ready.ok, ready.reason);

  report.auth = { email, password, uiSignup: true };
  process.env.BRICLOG_TEST_EMAIL = email;
  process.env.BRICLOG_TEST_PASSWORD = password;

  const ensured = await ensureJourneyUser(email, password);
  pushStep(report, "signup", "profile_ensured", ensured.ok, ensured.reason || "ok");
  if (!inWorkspace && !ready.ok) throw new Error("signup_workspace_timeout");
}

async function waitForBlogResult(page, timeoutMs) {
  const genBtn = page.locator('[data-briclog-generate="blog"]:not([disabled])').first();
  await genBtn.waitFor({ state: "visible", timeout: 20_000 });
  await syncE2eSessionToPage(page, BASE);
  const t0 = Date.now();

  const blogApiPromise = page
    .waitForResponse(
      (r) => r.url().includes("/api/content/blog") && r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
      apiMs: Date.now() - t0,
    }))
    .catch((e) => ({ apiError: e.message }));

  await dismissWorkspaceModals(page);
  await genBtn.scrollIntoViewIfNeeded().catch(() => null);
  await genBtn.click({ timeout: 10_000, force: true });
  await page.waitForTimeout(1200);

  const researchStarted = await page
    .waitForResponse(
      (r) => r.url().includes("/api/content/research") && r.request().method() === "POST",
      { timeout: 10_000 }
    )
    .then(() => true)
    .catch(() => false);
  if (!researchStarted) {
    await page.keyboard.press("Control+Enter").catch(() => null);
  }

  const uiPromise = page.waitForFunction(
    () => {
      const t = document.body.innerText || "";
      if (t.includes("여기에 편집본이 채워집니다")) return false;
      if (/조사·편집 중|만드는 중|쓰는 중|편집본 작성 중/.test(t)) return false;
      const article = document.querySelector("article");
      if (article && (article.innerText || "").trim().length > 120) return true;
      const headings = [...document.querySelectorAll("h2, h3")].filter((el) => {
        const text = (el.textContent || "").trim();
        return text.length > 4 && !/오늘의 편집본|브랜드명|지역|주제/.test(text);
      });
      return headings.length >= 2;
    },
    undefined,
    { timeout: timeoutMs }
  );

  const [apiSettled, uiSettled] = await Promise.allSettled([blogApiPromise, uiPromise]);
  const api =
    apiSettled.status === "fulfilled"
      ? apiSettled.value
      : { apiError: apiSettled.reason?.message || "blog_api_timeout" };
  const uiOk = uiSettled.status === "fulfilled";
  const sections = api.body?.blogContent?.sections?.length || 0;
  const apiHasContent =
    !api.apiError &&
    api.status < 400 &&
    api.body?.ok !== false &&
    !api.body?.withheld &&
    sections >= 2;
  return {
    api,
    uiOk: uiOk || apiHasContent,
    apiHasContent,
    sections,
    uiMs: Date.now() - t0,
    userMessage: api.body?.userMessage || null,
  };
}

async function waitForChannelApiResult(page, channelId, timeoutMs) {
  const contentKey =
    channelId === "place"
      ? "placeContent"
      : channelId === "insta"
        ? "instagramContent"
        : "imagePrompts";

  const btn = page.locator(`[data-briclog-generate="${channelId}"]`).first();
  await btn.scrollIntoViewIfNeeded().catch(() => null);

  const apiPromise = page
    .waitForResponse(
      (r) => r.url().includes("/api/content/channel") && r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
    }))
    .catch((e) => ({ apiError: e.message }));

  await dismissWorkspaceModals(page);
  await syncE2eSessionToPage(page, BASE);
  await btn.click({ timeout: 10_000, force: true });
  const api = await apiPromise;
  const hasContent =
    !api.apiError &&
    api.status < 400 &&
    api.body?.ok !== false &&
    !api.body?.withheld &&
    Boolean(api.body?.[contentKey]);
  return { api, hasContent, contentKey };
}

async function runUiSignupWithFallback(page, report, email, password) {
  try {
    await runUiSignup(page, report, email, password);
    const signupOk = report.steps.some(
      (s) => s.phase === "signup" && s.step === "workspace_ready" && s.ok
    );
    if (signupOk) return;
  } catch (err) {
    pushStep(report, "signup", "ui_signup_error", false, err.message?.slice(0, 120));
  }

  console.log("  ↳ UI 가입 실패 — admin 계정 생성 후 세션 로그인");
  const ensured = await ensureJourneyUser(email, password);
  pushStep(report, "signup", "admin_fallback", ensured.ok, ensured.reason || "ok");
  if (!ensured.ok) throw new Error(ensured.reason || "signup_failed");

  process.env.BRICLOG_TEST_EMAIL = email;
  process.env.BRICLOG_TEST_PASSWORD = password;
  report.auth = { email, password, uiSignup: false, fallback: "admin_create" };

  const { buildSupabasePlaywrightStorage, applySupabaseSessionToContext } = await import(
    "./ensure-e2e-test-user.mjs"
  );
  const session = await buildSupabasePlaywrightStorage(BASE);
  if (!session.ok) throw new Error(session.reason || "session_failed");
  await applySupabaseSessionToContext(page.context(), session);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  const ready = await waitForWorkspaceReady(page, 45_000);
  pushStep(report, "signup", "workspace_ready", ready.ok, ready.reason);
  if (!ready.ok) throw new Error(ready.reason || "workspace_not_ready");
}

async function extractResultMetrics(page, channel) {
  return page.evaluate((ch) => {
    const article = document.querySelector("article");
    const articleText = (article?.innerText || "").trim();
    const bodyText = (document.body.innerText || "").trim();
    const headings = [...document.querySelectorAll("h2, h3")]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t.length > 4 && !/오늘의 편집본|브랜드명|지역|주제/.test(t));
    const headingText = headings.join("\n");
    const contentChars = Math.max(
      articleText.replace(/\s/g, "").length,
      headingText.replace(/\s/g, "").length
    );
    const hashtags = (bodyText.match(/#[\w가-힣]+/g) || []).length;
    return {
      articleChars: contentChars,
      articlePreview: (articleText || headingText).slice(0, 120),
      bodyChars: bodyText.replace(/\s/g, "").length,
      hashtagCount: hashtags,
      hasArticle: contentChars > 80 || headings.length >= 2,
      headingCount: headings.length,
      channel: ch,
    };
  }, channel);
}

async function openWorkspace(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  let ready = await waitForWorkspaceReady(page, 45_000);
  if (!ready.ok) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => null);
    await dismissWorkspaceModals(page);
    ready = await waitForWorkspaceReady(page, 30_000);
  }
  return ready;
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

async function fillIfPresent(page, placeholderRe, value) {
  const el = page.getByPlaceholder(placeholderRe).first();
  if (!(await el.count())) return false;
  await el.fill(value);
  await el.dispatchEvent("input").catch(() => null);
  return true;
}

async function fillCommonFields(page, form, channel) {
  if (channel && channel !== "blog") {
    await ensureSmokeBrand(page, BASE, form);
  }
  if (channel === "insta" || channel === "image") {
    await fillChannelFormViaDom(page, channel, form);
    if (channel === "insta" && form.instaScene) {
      await fillIfPresent(page, /장면/i, form.instaScene);
    }
    if (channel === "image") {
      await fillLabeledField(page, /주제 \(직접 입력\)/, form.topic || "");
    }
    await page.waitForTimeout(600);
    return;
  }
  await fillLabeledField(page, /^브랜드명$/, form.brandName || "");
  await fillLabeledField(page, /^지역$/, form.region || "");
  await fillLabeledField(page, /^오늘의 주제$/, form.topic || "");
  await fillBlogFormViaDom(page, form);
  await page.waitForTimeout(600);
}

async function runChannelGeneration(page, report, channelDef, form) {
  const run = {
    channel: channelDef.id,
    label: channelDef.label,
    status: "running",
    elapsedMs: 0,
    metrics: null,
    failReason: null,
  };
  const t0 = Date.now();

  try {
    const ready = await openWorkspace(page);
    if (!ready.ok) throw new Error(ready.reason || "workspace_not_ready");

    await page.getByRole("button", { name: channelDef.menuPattern }).first().click({ timeout: 8000 });
    await page.waitForTimeout(600);

    if (channelDef.standalone) {
      const box = page.locator('label:has-text("단독으로 받기") input[type="checkbox"]').first();
      if (await box.count()) await box.check({ force: true }).catch(() => null);
    }

    await fillCommonFields(page, form, channelDef.id);
    pushStep(report, channelDef.id, "form_filled", true, { brandName: form.brandName });

    if (channelDef.id === "blog") {
      const blogResult = await waitForBlogResult(page, BLOG_SLA_MS);
      run.metrics = await extractResultMetrics(page, channelDef.id);
      run.api = {
        status: blogResult.api?.status,
        sections: blogResult.sections,
        apiMs: blogResult.api?.apiMs,
        userMessage: blogResult.userMessage,
        apiError: blogResult.api?.apiError || null,
      };
      if (blogResult.apiHasContent || blogResult.uiOk) {
        run.status =
          (blogResult.uiMs || 0) > BLOG_SLA_MS ? "pass_with_warnings" : "pass";
      } else {
        run.status = "fail";
        run.failReason =
          blogResult.userMessage ||
          blogResult.api?.apiError ||
          "blog_generation_failed";
      }
    } else {
      const genSel = `[data-briclog-generate="${channelDef.id}"]:not([disabled])`;
      let btn = page.locator(genSel).first();
      if (!(await btn.count())) {
        btn = page
          .locator("button:not([disabled])")
          .filter({ hasText: channelDef.generatePattern })
          .first();
      }
      await btn.waitFor({ state: "visible", timeout: 30_000 });

      const channelResult = await waitForChannelApiResult(
        page,
        channelDef.id,
        CHANNEL_SLA_MS
      );
      run.metrics = await extractResultMetrics(page, channelDef.id);
      run.api = {
        status: channelResult.api?.status,
        contentKey: channelResult.contentKey,
        apiError: channelResult.api?.apiError || null,
      };
      if (channelResult.hasContent) {
        run.status = "pass";
      } else {
        const wait = await waitForGenerationResult(page, 15_000);
        run.metrics = await extractResultMetrics(page, channelDef.id);
        run.status =
          wait.ok || run.metrics.hasArticle || run.metrics.bodyChars > 200
            ? "pass"
            : "fail";
        if (run.status === "fail") {
          run.failReason =
            channelResult.api?.body?.userMessage ||
            channelResult.api?.apiError ||
            "channel_generation_failed";
        }
      }
    }
  } catch (err) {
    run.status = "fail";
    run.failReason = err.message?.slice(0, 240);
    run.metrics = await extractResultMetrics(page, channelDef.id).catch(() => null);
  }

  run.elapsedMs = Date.now() - t0;
  const ok = run.status === "pass" || run.status === "pass_with_warnings";
  pushStep(report, channelDef.id, "generation", ok, {
    status: run.status,
    elapsedSec: Math.round(run.elapsedMs / 1000),
    metrics: run.metrics,
    failReason: run.failReason,
  });
  return run;
}

function buildVerdict(report) {
  const channelRuns = report.channelRuns || [];
  const channelPass = channelRuns.filter(
    (r) => r.status === "pass" || r.status === "pass_with_warnings"
  ).length;
  const failedSteps = report.steps.filter((s) => s.ok === false);
  report.summary = {
    channelPass,
    channelTotal: channelRuns.length,
    failedSteps: failedSteps.length,
    totalMs: report.totalMs,
    verdict:
      channelPass === channelRuns.length && channelPass >= 3
        ? failedSteps === 0
          ? "pass"
          : "pass_with_notes"
        : channelPass >= 2
          ? "partial"
          : "fail",
  };
  report.status = report.summary.verdict;
}

async function main() {
  loadEnvLocal();
  process.env.BRICLOG_MISSION = process.env.BRICLOG_MISSION || "true";

  const stamp = Date.now();
  const email = process.env.METICULOUS_USER_EMAIL || `meticulous-${stamp}@briclog.ai`;
  const password = process.env.METICULOUS_USER_PASSWORD || "BriclogMeticulous9!";

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    persona: "꼼꼼한 신규 회원 (PC, 카페·강남)",
    brand: BRAND,
    slaMs: CHANNEL_SLA_MS,
    blogSlaMs: BLOG_SLA_MS,
    status: "pass",
    steps: [],
    channelRuns: [],
    auth: null,
    summary: null,
    totalMs: 0,
  };

  console.log("=== METICULOUS NEW USER JOURNEY ===");
  console.log("base:", BASE);
  console.log("email:", email);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required — npm install -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await guestContext.addInitScript(() => {
    try {
      sessionStorage.setItem("briclog-intro-session-done", "1");
    } catch {
      /* ignore */
    }
  });
  const guestPage = await guestContext.newPage();
  const channelFilter = parseChannelFilter();
  const channelsToRun = channelFilter
    ? CHANNELS.filter((c) => channelFilter.has(c.id))
    : CHANNELS;
  const journeyForm = {
    ...BRAND,
    brandName: `${BRAND.brandName}${String(stamp).slice(-4)}`,
  };
  report.brand = journeyForm;

  saveReport(report);

  try {
    if (process.env.METICULOUS_SKIP_SIGNUP !== "1") {
      console.log("\n--- Phase 1: Guest landing ---");
      await runGuestLanding(guestPage, report);
      saveReport(report);

      console.log("\n--- Phase 2: UI signup ---");
      await runUiSignupWithFallback(guestPage, report, email, password);
      saveReport(report);
    } else {
      process.env.BRICLOG_TEST_EMAIL = email;
      process.env.BRICLOG_TEST_PASSWORD = password;
      await ensureJourneyUser(email, password);
      report.auth = { email, password, uiSignup: false, skipped: true };
      saveReport(report);
    }
  } finally {
    await guestContext.close();
  }

  process.env.BRICLOG_TEST_EMAIL = email;
  process.env.BRICLOG_TEST_PASSWORD = password;

  console.log("\n--- Phase 3–4: Workspace + channel generation ---");
  const ctxResult = await createAuthenticatedContext(browser, BASE, {
    width: 1440,
    height: 900,
  });
  if (!ctxResult.ok) throw new Error(ctxResult.reason || "auth_context_failed");

  const page = await ctxResult.context.newPage();
  await installE2eAuthRequestBridge(page, BASE);

  const brand = await ensureSmokeBrand(page, BASE, journeyForm);
  pushStep(report, "brand", "brand_selected", brand.ok, brand.reason || brand.brandName);
  saveReport(report);

  for (const ch of channelsToRun) {
    console.log(`\n→ ${ch.label} (${ch.id})`);
    const run = await runChannelGeneration(page, report, ch, journeyForm);
    report.channelRuns.push(run);
    saveReport(report);
    if (ch.id !== channelsToRun[channelsToRun.length - 1].id) {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await dismissWorkspaceModals(page);
      await page.waitForTimeout(1200);
    }
  }

  await ctxResult.context.close();
  await browser.close();

  report.totalMs = Date.now() - t0;
  buildVerdict(report);
  saveReport(report);

  console.log("\n=== SUMMARY ===");
  console.log("verdict:", report.summary.verdict);
  console.log("channels:", `${report.summary.channelPass}/${report.summary.channelTotal} pass`);
  console.log("total:", `${(report.totalMs / 1000).toFixed(0)}s`);
  console.log("report:", OUT);

  process.exit(report.summary.verdict === "fail" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  try {
    saveReport({
      at: new Date().toISOString(),
      status: "crash",
      error: err.message,
      steps: [],
      channelRuns: [],
    });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
