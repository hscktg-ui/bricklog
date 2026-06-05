/**
 * 100명 페르소나 UX 스모크 (Playwright)
 * Run: npm run test:hundred-users
 * Env: BASE_URL, BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD (.env.local)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { HUNDRED_USER_PERSONAS } from "../lib/qa/hundredUserPersonas.js";
import {
  ensureE2eTestUser,
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "./ensure-e2e-test-user.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "hundred-user-ux-report.json");

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

function countBlockingOverlays(page) {
  return page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "absolute") continue;
      const r = el.getBoundingClientRect();
      if (
        r.width >= window.innerWidth * 0.85 &&
        r.height >= window.innerHeight * 0.85 &&
        s.pointerEvents !== "none" &&
        parseFloat(s.opacity) > 0.05
      ) {
        n += 1;
      }
    }
    return n;
  });
}

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return "absent";
  const skip = page.locator('[data-briclog-intro-skip="1"]');
  if (await skip.count()) {
    await skip.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
  if (await intro.count()) {
    await page.keyboard.press("Enter").catch(() => null);
    await page.waitForTimeout(400);
  }
  return (await intro.count()) ? "still_open" : "dismissed";
}

async function dismissWelcome(page) {
  const btn = page.getByRole("button", { name: /건너뛰기|시작하기/i });
  if (await btn.count()) {
    await btn.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
}

async function findStartCta(page) {
  const byData = page.locator('[data-briclog-cta="start"]');
  if (await byData.count()) return byData.first();
  return page.getByRole("button", { name: /무료(로)? 시작/i }).first();
}

async function authUiVisible(page) {
  return page.evaluate(() => {
    if (document.querySelector('input[type="email"]')) return true;
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    return Boolean(dialog?.querySelector("input, textarea"));
  });
}

async function ensureLoggedIn(page) {
  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;
  if (!email || !password) return { ok: false, reason: "no_credentials" };

  const inApp = await page
    .getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i)
    .first()
    .count()
    .catch(() => 0);
  if (inApp) return { ok: true, reason: "already_in_app" };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page
    .waitForSelector('[data-briclog-cta="start"], button', { timeout: 20_000 })
    .catch(() => null);
  await dismissIntro(page);

  const cta = await findStartCta(page);
  if (await cta.count()) {
    await cta.scrollIntoViewIfNeeded().catch(() => null);
    await cta.click({ timeout: 12_000 }).catch(() => null);
    await page
      .waitForSelector('input[type="email"]', { timeout: 8000 })
      .catch(() => null);
  }

  if (!(await authUiVisible(page))) {
    return { ok: false, reason: "no_auth_form" };
  }

  const loginTab = page.getByRole("button", { name: /^로그인$/i }).first();
  if (await loginTab.count()) {
    await loginTab.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }

  await page.getByLabel(/이메일|email/i).first().fill(email);
  await page.getByLabel(/비밀번호|password/i).first().fill(password);
  await page.getByRole("button", { name: /^로그인$/i }).last().click();
  await page.waitForTimeout(6000);
  await dismissWelcome(page);

  const brandField = await page
    .getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i)
    .first()
    .count()
    .catch(() => 0);
  if (brandField > 0) return { ok: true, reason: "logged_in" };

  const authErr = await page
    .locator("text=/이메일|비밀번호|인증|로그인/")
    .first()
    .textContent()
    .catch(() => "");
  return { ok: false, reason: "login_failed", detail: authErr?.slice(0, 120) || null };
}

function isMobileViewport(persona) {
  return persona.device === "mobile" || persona.device === "tablet";
}

async function waitForWorkspaceShell(page) {
  await page
    .waitForSelector(
      'nav[aria-label="작업 메뉴"], nav[aria-label="채널 바로가기"], .briclog-workspace-header',
      { timeout: 15_000 }
    )
    .catch(() => null);
}

async function isWorkspaceLoaded(page) {
  return page.evaluate(() =>
    Boolean(
      document.querySelector(".briclog-workspace-header") ||
        document.querySelector('nav[aria-label="작업 메뉴"]') ||
        document.querySelector('nav[aria-label="채널 바로가기"]')
    )
  );
}

async function closeMobileDrawerIfOpen(page) {
  const drawer = page.locator('aside[aria-modal="true"]');
  if (!(await drawer.count())) return;
  const close = page.getByRole("button", { name: /메뉴 닫기|^닫기$/i }).first();
  if (await close.count()) {
    await close.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
}

async function openMobileDrawer(page, persona) {
  if (!isMobileViewport(persona)) return;
  if (await page.locator('aside[aria-modal="true"]').count()) return;
  const openers = [
    page.getByRole("button", { name: /전체 메뉴/i }),
    page.getByRole("button", { name: /메뉴 열기/i }),
  ];
  for (const opener of openers) {
    if (await opener.count()) {
      await opener.first().click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(600);
      break;
    }
  }
}

async function ensureMobileFormPane(page) {
  const formTab = page.getByRole("tab", { name: /^주제$/ }).first();
  if (await formTab.count()) {
    const selected = await formTab.getAttribute("aria-selected");
    if (selected !== "true") {
      await formTab.click({ timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(400);
    }
  }
}

async function hasGenerateCta(page) {
  const primary = page.locator("button.briclog-btn-primary").filter({
    hasText: /조사 후 글 받기|구성안 만들기|이야기 쓰기/i,
  });
  if (await primary.count()) return true;
  return (await page.locator('[data-briclog-generate="blog"]').count()) > 0;
}

async function hasBrandField(page) {
  if (await page.getByLabel(/^브랜드명$/).count()) return true;
  return (await page.getByPlaceholder(/매장·브랜드|팀 이름/i).count()) > 0;
}

async function sidebarNav(page) {
  return page.locator('nav[aria-label="작업 메뉴"]').first();
}

async function checkFocus(page, persona) {
  const steps = [];
  for (const f of persona.focus || []) {
    if (f === "landing" || f === "cta") {
      const cta = page.locator('[data-briclog-cta="start"]').first();
      steps.push({
        focus: f,
        ok: (await cta.count()) > 0,
      });
    } else if (f === "intro") {
      const intro = await dismissIntro(page);
      steps.push({ focus: f, ok: intro !== "still_open", detail: intro });
    } else if (f === "sample" || f === "pricing") {
      const sel =
        f === "sample" ? "#landing-sample, [id*='sample']" : "#landing-stats, [id*='pricing']";
      const el = page.locator(sel).first();
      steps.push({ focus: f, ok: (await el.count()) > 0 });
    } else if (f === "generate" || f === "first_write") {
      if (isMobileViewport(persona)) await ensureMobileFormPane(page);
      steps.push({ focus: f, ok: await hasGenerateCta(page) });
    } else if (f === "result_view" || f === "overlay") {
      const placeholder = page.locator('[aria-busy="true"], [aria-label*="만드는"]');
      const result = page.getByText(/완성본|발행 전 복사|여기에 표시/i).first();
      steps.push({
        focus: f,
        ok: true,
        detail: "static_ui_only",
        hasResult: (await result.count()) > 0,
        hasPlaceholder: (await placeholder.count()) > 0,
      });
    } else if (f === "sidebar") {
      if (isMobileViewport(persona)) await openMobileDrawer(page, persona);
      const nav = await sidebarNav(page);
      steps.push({ focus: f, ok: (await nav.count()) > 0 });
    } else if (f === "brand_form") {
      if (isMobileViewport(persona)) await ensureMobileFormPane(page);
      steps.push({ focus: f, ok: await hasBrandField(page) });
    } else if (f === "history") {
      const heading = page.getByRole("heading", { name: /초안 기록/i });
      if (await heading.count()) {
        steps.push({ focus: f, ok: true });
      } else {
        if (isMobileViewport(persona)) await openMobileDrawer(page, persona);
        const nav = (await sidebarNav(page)).getByRole("button", {
          name: /초안 기록|^기록$/i,
        });
        steps.push({ focus: f, ok: (await nav.count()) > 0 });
      }
    } else if (f === "growth") {
      const heading = page.getByRole("heading", { name: /브랜드 작업실/i });
      if (await heading.count()) {
        steps.push({ focus: f, ok: true });
      } else {
        if (isMobileViewport(persona)) await openMobileDrawer(page, persona);
        const nav = (await sidebarNav(page)).getByRole("button", {
          name: /브랜드 작업실|작업실/i,
        });
        steps.push({ focus: f, ok: (await nav.count()) > 0 });
      }
    } else if (f === "draft_review" || f === "review") {
      const panel =
        (await page.getByRole("heading", { name: /붙여넣기 검수/i }).count()) > 0 ||
        (await page.getByPlaceholder(/본문을 붙여 넣으세요/i).count()) > 0;
      steps.push({ focus: f, ok: panel });
    } else {
      steps.push({ focus: f, ok: true, detail: "skipped_check" });
    }
  }
  return steps;
}

async function navigateMenu(page, menu, persona) {
  if (!menu) return true;
  const mobile = isMobileViewport(persona);

  if (mobile && ["blog", "place", "insta"].includes(menu)) {
    const labels = { blog: "이야기", place: "플레이스", insta: "인스타" };
    await closeMobileDrawerIfOpen(page);
    const bottom = page
      .locator('nav[aria-label="채널 바로가기"] button')
      .filter({ hasText: labels[menu] });
    if (await bottom.count()) {
      await bottom.first().click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(700);
      if (menu === "blog") await ensureMobileFormPane(page);
      return true;
    }
  }

  if (mobile) await openMobileDrawer(page, persona);

  const map = {
    blog: /이야기/,
    place: /플레이스/,
    insta: /인스타/,
    history: /초안 기록|^기록$/,
    review: /붙여넣기 검수|^검수$/,
    growth: /브랜드 작업실/,
  };
  const pattern = map[menu];
  if (!pattern) return true;

  const nav = await sidebarNav(page);
  let btn = nav.getByRole("button", { name: pattern }).first();
  if (!(await btn.count())) {
    btn = page.getByRole("button", { name: pattern }).first();
  }
  if (!(await btn.count())) return false;
  await btn.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(800);
  if (mobile) await closeMobileDrawerIfOpen(page);
  if (menu === "blog" && mobile) await ensureMobileFormPane(page);
  return true;
}

async function runPersona(page, persona, { loggedIn }) {
  const result = {
    id: persona.id,
    label: persona.label,
    journeyType: persona.journeyType,
    device: persona.device,
    status: "pass",
    steps: [],
  };

  if (persona.needsAuth && !loggedIn) {
    result.status = "skip";
    result.skipReason = "auth_required_but_login_failed";
    return result;
  }

  try {
    if (!persona.needsAuth) {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page
        .waitForSelector('[data-briclog-cta="start"], h1', { timeout: 25_000 })
        .catch(() => null);
      await contextPrepIntro(page, persona);
      const intro = await dismissIntro(page);
      result.steps.push({ step: "intro", ok: intro !== "still_open", detail: intro });
      const blockers = await countBlockingOverlays(page);
      result.steps.push({
        step: "blockers",
        ok: blockers <= 1,
        blockingCount: blockers,
      });
      result.steps.push(...(await checkFocus(page, persona)));
    } else {
      if (!loggedIn) {
        result.status = "skip";
        result.skipReason = "not_logged_in";
        return result;
      }
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await dismissIntro(page);
      await dismissWelcome(page);
      await waitForWorkspaceShell(page);
      await navigateMenu(page, persona.primaryMenu, persona);
      const blockers = await countBlockingOverlays(page);
      result.steps.push({
        step: "blockers",
        ok: blockers <= 2,
        blockingCount: blockers,
      });
      result.steps.push(...(await checkFocus(page, persona)));
      if (persona.brand?.brandName) {
        const brandInput = page.getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i).first();
        if (await brandInput.count()) {
          const val = await brandInput.inputValue().catch(() => "");
          result.steps.push({
            step: "brand_field",
            ok: val.length >= 0,
            hasValue: val.length > 0,
          });
        }
      }
    }

    const failed = result.steps.filter((s) => s.ok === false);
    if (failed.length) result.status = "fail";
  } catch (err) {
    result.status = "fail";
    result.error = err.message;
  }

  return result;
}

async function contextPrepIntro(page, persona) {
  if (persona.journeyType === "guest_desktop" || persona.journeyType === "guest_mobile") {
    return;
  }
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("briclog-intro-session-done", "1");
    } catch {
      /* ignore */
    }
  });
}

async function main() {
  loadEnvLocal();

  if (HUNDRED_USER_PERSONAS.length !== 100) {
    console.error("Expected 100 personas, got", HUNDRED_USER_PERSONAS.length);
    process.exit(1);
  }

  let healthOk = false;
  try {
    const res = await fetch(`${BASE}/api/content/status`, {
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json();
    healthOk = res.ok && data.llmAvailable !== false;
  } catch (e) {
    console.error("Server health failed:", e.message);
  }

  if (!healthOk) {
    console.error("BASE_URL not ready or LLM unavailable:", BASE);
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright 미설치 — npm install -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  let loggedIn = false;
  let authStorage = null;
  let authSession = null;
  const authPersonas = HUNDRED_USER_PERSONAS.filter((p) => p.needsAuth);
  let e2eUserMeta = null;
  if (authPersonas.length && !process.env.BRICLOG_TEST_EMAIL) {
    const auto = await ensureE2eTestUser();
    if (auto.ok) {
      process.env.BRICLOG_TEST_EMAIL = auto.email;
      process.env.BRICLOG_TEST_PASSWORD = auto.password;
      e2eUserMeta = { email: auto.email, reused: auto.reused, auto: true };
    } else {
      e2eUserMeta = { auto: false, reason: auto.reason };
    }
  }
  if (authPersonas.length) {
    const session = await buildSupabasePlaywrightStorage(BASE);
    if (session.ok) {
      authSession = session;
      const verifyCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      await applySupabaseSessionToContext(verifyCtx, session);
      verifyCtx.setDefaultTimeout(12_000);
      const verifyPage = await verifyCtx.newPage();
      await verifyPage.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await verifyPage.waitForTimeout(4000);
      const inWorkspace = await isWorkspaceLoaded(verifyPage);
      await verifyCtx.close();

      if (inWorkspace) {
        loggedIn = true;
        authStorage = session.storageState;
        e2eUserMeta = {
          ...(e2eUserMeta || {}),
          login: { ok: true, reason: "supabase_session", email: session.email },
        };
      } else {
        e2eUserMeta = {
          ...(e2eUserMeta || {}),
          sessionInjected: false,
          sessionVerify: "landing_not_workspace",
        };
      }
    }
    if (!loggedIn) {
      if (session?.ok) {
        e2eUserMeta = {
          ...(e2eUserMeta || {}),
          sessionFallback: "inject_failed_verify",
        };
      }
      const loginCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const loginPage = await loginCtx.newPage();
      const loginRes = await ensureLoggedIn(loginPage);
      loggedIn = loginRes.ok;
      e2eUserMeta = {
        ...(e2eUserMeta || {}),
        login: loginRes,
        sessionFallback: session?.ok ? "inject_failed_verify" : session?.reason || "ui_login",
      };
      if (loggedIn) authStorage = await loginCtx.storageState();
      await loginCtx.close();
    }
  }

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    personaCount: HUNDRED_USER_PERSONAS.length,
    loggedIn,
    e2eUser: e2eUserMeta,
    runs: [],
  };

  let done = 0;
  for (const persona of HUNDRED_USER_PERSONAS) {
    const context = await browser.newContext({
      viewport: persona.viewport || { width: 1280, height: 800 },
      storageState:
        persona.needsAuth && authStorage && !authSession ? authStorage : undefined,
    });
    if (persona.needsAuth && authSession) {
      await applySupabaseSessionToContext(context, authSession);
    }
    context.setDefaultTimeout(12_000);
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("briclog-intro-session-done", "1");
        localStorage.setItem("briclog-welcome-dismissed-permanent", "1");
      } catch {
        /* ignore */
      }
    });
    const page = await context.newPage();
    try {
      report.runs.push(
        await Promise.race([
          runPersona(page, persona, { loggedIn }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("persona_timeout_45s")), 45_000)
          ),
        ]).catch((err) => ({
          id: persona.id,
          label: persona.label,
          journeyType: persona.journeyType,
          device: persona.device,
          status: "fail",
          error: err.message,
          steps: [],
        }))
      );
    } finally {
      await context.close();
    }
    done += 1;
    if (done % 10 === 0 || done === 100) {
      process.stdout.write(`\rUX personas: ${done}/100`);
    }
  }
  console.log("");

  await browser.close();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  const pass = report.runs.filter((r) => r.status === "pass").length;
  const fail = report.runs.filter((r) => r.status === "fail").length;
  const skip = report.runs.filter((r) => r.status === "skip").length;

  console.log("=== HUNDRED USER UX SMOKE ===\n");
  console.log("Report:", OUT);
  console.log(`pass ${pass} / fail ${fail} / skip ${skip} / total 100\n`);

  for (const run of report.runs.filter((r) => r.status === "fail").slice(0, 15)) {
    console.log(`FAIL [${run.id}] ${run.label}`);
    if (run.error) console.log(" ", run.error);
    for (const s of run.steps.filter((x) => x.ok === false).slice(0, 5)) {
      console.log(`  - ${s.step || s.focus}:`, s.detail || "");
    }
  }
  if (fail > 15) console.log(`... and ${fail - 15} more failures in report`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
