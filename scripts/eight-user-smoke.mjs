/**
 * 8 페르소나 스모크 (Playwright)
 * Run: node scripts/eight-user-smoke.mjs
 * Env: BASE_URL (default http://localhost:3005), BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { EIGHT_USER_PERSONAS } from "../lib/qa/eightUserPersonas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "eight-user-smoke-report.json");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env.local */
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
    await page.waitForTimeout(600);
    if (!(await intro.count())) return "dismissed";
  }

  await page.waitForTimeout(800);
  const startBtn = page.getByRole("button", {
    name: /지금 시작|시작하기|건너뛰기/i,
  });
  if (await startBtn.count()) {
    await startBtn.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(600);
  }
  if (await intro.count()) {
    await page.keyboard.press("Enter").catch(() => null);
    await page.waitForTimeout(500);
  }
  return (await intro.count()) ? "still_open" : "dismissed";
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

async function runPersona(page, persona) {
  const result = {
    id: persona.id,
    label: persona.label,
    status: "pass",
    steps: [],
  };

  if (
    persona.needsAuth &&
    (!process.env.BRICLOG_TEST_EMAIL || !process.env.BRICLOG_TEST_PASSWORD)
  ) {
    result.status = "skip";
    result.skipReason = "BRICLOG_TEST_EMAIL/PASSWORD not set";
    return result;
  }

  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page
      .waitForSelector('[data-briclog-cta="start"], button', {
        timeout: 20_000,
      })
      .catch(() => null);

    if (persona.prep === "markLandingIntroDone") {
      const introCount = await page.locator('[aria-label="BRICLOG 소개"]').count();
      result.steps.push({
        step: "intro_skipped",
        ok: introCount === 0,
      });
      if (introCount > 0) result.status = "warn";
    } else {
      const introState = await dismissIntro(page);
      result.steps.push({ step: "intro_dismiss", ok: introState !== "still_open", detail: introState });
      if (introState === "still_open") result.status = "fail";
    }

    const blockingAfterIntro = await countBlockingOverlays(page);
    result.steps.push({
      step: "no_fullscreen_blockers",
      ok: blockingAfterIntro <= 1,
      blockingCount: blockingAfterIntro,
    });
    if (blockingAfterIntro > 1) result.status = "fail";

    const cta = await findStartCta(page);
    if (await cta.count()) {
      await page
        .waitForFunction(
          () => {
            const el = document.querySelector('[data-briclog-cta="start"]');
            if (!el) return false;
            const s = getComputedStyle(el);
            return s.pointerEvents !== "none" && parseFloat(s.opacity) > 0.5;
          },
          { timeout: 12_000 }
        )
        .catch(() => null);
      await cta.scrollIntoViewIfNeeded().catch(() => null);
      await cta.click({ timeout: 10_000 }).catch(() => null);
      const authShown = await page
        .waitForSelector('input[type="email"]', { timeout: 6000 })
        .then(() => true)
        .catch(() => authUiVisible(page));
      result.steps.push({
        step: "landing_cta",
        ok: authShown,
      });
    } else {
      result.steps.push({ step: "landing_cta", ok: false, detail: "no_cta" });
    }

    if (persona.id === "p2_returning_guest") {
      await page
        .locator("#landing-sample, [id*='sample']")
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => null);
      result.steps.push({ step: "sample_scroll", ok: true });
    }

    if (persona.needsAuth) {
      const email = process.env.BRICLOG_TEST_EMAIL;
      const password = process.env.BRICLOG_TEST_PASSWORD;

      if (!(await authUiVisible(page))) {
        await cta.click({ timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }

      await page.getByLabel(/이메일|email/i).fill(email);
      await page.getByLabel(/비밀번호|password/i).fill(password);
      await page.getByRole("button", { name: /^로그인$/i }).last().click();
      await page.waitForTimeout(5000);

      const postLoginBlock = await countBlockingOverlays(page);
      result.steps.push({
        step: "post_login_blockers",
        ok: postLoginBlock <= 1,
        blockingCount: postLoginBlock,
      });

      if (persona.id === "p6_new_brand") {
        const brandInput = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
        if (await brandInput.count()) {
          await brandInput.click();
          await brandInput.fill("");
          await brandInput.pressSequentially("스모크 브랜드", { delay: 25 });
          const value = await brandInput.inputValue();
          result.steps.push({
            step: "brand_type",
            ok: value.includes("스모크"),
            value,
          });
        }
      }

      if (persona.id === "p7_channel_switch") {
        for (const name of [/블로그/i, /인스타/i, /플레이스|스마트플레이스/i]) {
          const tab = page.getByRole("button", { name }).first();
          if (await tab.count()) {
            const t0 = Date.now();
            await tab.click({ timeout: 5000 }).catch(() => null);
            result.steps.push({
              step: `channel_${name.source}`,
              ok: Date.now() - t0 < 4000,
              ms: Date.now() - t0,
            });
          }
        }
        const postSwitchBlock = await countBlockingOverlays(page);
        result.steps.push({
          step: "after_channel_switch",
          ok: postSwitchBlock <= 1,
          blockingCount: postSwitchBlock,
        });
      }

      if (persona.id === "p8_history_research") {
        const historyBtn = page.getByRole("button", { name: /기록|히스토리/i }).first();
        if (await historyBtn.count()) {
          await historyBtn.click({ timeout: 5000 }).catch(() => null);
          await page.waitForTimeout(1500);
          result.steps.push({
            step: "history_menu",
            ok: true,
          });
        }
      }
    }

    const failed = result.steps.filter((s) => s.ok === false);
    if (failed.length && result.status !== "skip") result.status = "fail";
  } catch (err) {
    result.status = "fail";
    result.error = err.message;
  }

  return result;
}

async function main() {
  loadEnvLocal();
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright 미설치");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  const report = {
    base: BASE,
    personas: EIGHT_USER_PERSONAS.map((p) => ({
      id: p.id,
      label: p.label,
      needsAuth: p.needsAuth,
    })),
    runs: [],
  };

  for (const persona of EIGHT_USER_PERSONAS) {
    const context = await browser.newContext({
      viewport: persona.viewport || { width: 1280, height: 800 },
    });
    await context.addInitScript(() => {
      const mq = window.matchMedia;
      window.matchMedia = (q) => {
        if (String(q).includes("prefers-reduced-motion")) {
          return {
            matches: true,
            media: q,
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        }
        return mq.call(window, q);
      };
    });
    if (persona.prep === "markLandingIntroDone") {
      await context.addInitScript(() => {
        try {
          sessionStorage.setItem("briclog-intro-session-done", "1");
        } catch {
          /* ignore */
        }
      });
    }
    const page = await context.newPage();
    try {
      report.runs.push(await runPersona(page, persona));
    } finally {
      await context.close();
    }
  }

  await browser.close();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("=== EIGHT USER SMOKE ===\n");
  console.log("Report:", OUT);
  for (const run of report.runs) {
    console.log(`\n[${run.id}] ${run.status}`);
    if (run.skipReason) console.log(" ", run.skipReason);
    if (run.error) console.log(" ", run.error);
    for (const s of run.steps || []) {
      console.log(`  - ${s.step}:`, s.ok ? "ok" : "FAIL", s.detail || s.blockingCount || "");
    }
  }

  const failed = report.runs.filter((r) => r.status === "fail");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
