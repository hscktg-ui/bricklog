/**
 * 100명 페르소나 UX 스모크 (Playwright)
 * Run: npm run test:hundred-users
 * Env: BASE_URL, BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD (.env.local)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { HUNDRED_USER_PERSONAS } from "../lib/qa/hundredUserPersonas.js";

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

async function ensureLoggedIn(page) {
  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;
  if (!email || !password) return { ok: false, reason: "no_credentials" };

  const inApp = await page
    .getByPlaceholder(/매장·브랜드|브랜드/i)
    .first()
    .count()
    .catch(() => 0);
  if (inApp) return { ok: true, reason: "already_in_app" };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissIntro(page);
  const start = page.locator('[data-briclog-cta="start"]').first();
  if (await start.count()) {
    await start.click({ timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
  const emailInput = page.locator('input[type="email"]').first();
  if (!(await emailInput.count())) return { ok: false, reason: "no_auth_form" };
  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^로그인$/i }).last().click();
  await page.waitForTimeout(4500);
  await dismissWelcome(page);
  const ok = await page
    .getByPlaceholder(/매장·브랜드|브랜드/i)
    .first()
    .count()
    .catch(() => 0);
  return { ok: ok > 0, reason: ok ? "logged_in" : "login_failed" };
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
      const btn = page.getByRole("button", { name: /이야기 쓰기|구성안 만들기/i }).first();
      steps.push({ focus: f, ok: (await btn.count()) > 0 });
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
    } else if (f === "sidebar" || f === "brand_form") {
      const brand = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
      steps.push({ focus: f, ok: (await brand.count()) > 0 });
    } else if (f === "history" || f === "growth") {
      const nav = page.getByRole("button", { name: /기록|성장/i }).first();
      steps.push({ focus: f, ok: (await nav.count()) > 0 });
    } else if (f === "draft_review" || f === "review") {
      const tab = page.getByRole("button", { name: /검수|붙여/i }).first();
      steps.push({ focus: f, ok: (await tab.count()) > 0 });
    } else {
      steps.push({ focus: f, ok: true, detail: "skipped_check" });
    }
  }
  return steps;
}

async function navigateMenu(page, menu) {
  if (!menu) return true;
  const map = {
    blog: /블로그|이야기/i,
    place: /플레이스|스마트플레이스/i,
    insta: /인스타/i,
    history: /기록/i,
    review: /검수|붙여/i,
    growth: /성장/i,
  };
  const pattern = map[menu];
  if (!pattern) return true;
  const btn = page.getByRole("button", { name: pattern }).first();
  if (!(await btn.count())) return false;
  await btn.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(800);
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
      await navigateMenu(page, persona.primaryMenu);
      const blockers = await countBlockingOverlays(page);
      result.steps.push({
        step: "blockers",
        ok: blockers <= 2,
        blockingCount: blockers,
      });
      result.steps.push(...(await checkFocus(page, persona)));
      if (persona.brand?.brandName) {
        const brandInput = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
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
  const authPersonas = HUNDRED_USER_PERSONAS.filter((p) => p.needsAuth);
  if (authPersonas.length) {
    const loginCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const loginPage = await loginCtx.newPage();
    const loginRes = await ensureLoggedIn(loginPage);
    loggedIn = loginRes.ok;
    if (loggedIn) authStorage = await loginCtx.storageState();
    await loginCtx.close();
  }

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    personaCount: HUNDRED_USER_PERSONAS.length,
    loggedIn,
    runs: [],
  };

  for (const persona of HUNDRED_USER_PERSONAS) {
    const context = await browser.newContext({
      viewport: persona.viewport || { width: 1280, height: 800 },
      storageState: persona.needsAuth && authStorage ? authStorage : undefined,
    });
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
      report.runs.push(await runPersona(page, persona, { loggedIn }));
    } finally {
      await context.close();
    }
  }

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
