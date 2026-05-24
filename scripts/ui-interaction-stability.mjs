/**
 * UI 인터랙션 안정성 E2E (Playwright)
 * Run: npm run test:ui-stability
 * Env: BASE_URL (default http://localhost:3005), BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "ui-interaction-stability-report.json");

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

function diagnoseFn() {
  const fixedOverlays = [];
  const pointerNoneEls = [];
  const highZ = [];
  function describeEl(el) {
    if (!el || el.nodeType !== 1) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      id: el.id || null,
      role: el.getAttribute("role"),
      className: String(el.className || "").slice(0, 200),
      position: s.position,
      zIndex: s.zIndex,
      pointerEvents: s.pointerEvents,
      opacity: s.opacity,
      cursor: s.cursor,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
    };
  }
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    const z = parseInt(s.zIndex, 10);
    if (s.pointerEvents === "none") {
      const r = el.getBoundingClientRect();
      if (r.width > 40 && r.height > 40) pointerNoneEls.push(describeEl(el));
    }
    if (Number.isFinite(z) && z >= 50) highZ.push(describeEl(el));
    if (s.position !== "fixed" && s.position !== "absolute") continue;
    const r = el.getBoundingClientRect();
    const cls = String(el.className || "");
    const covers =
      r.width >= window.innerWidth * 0.85 &&
      r.height >= window.innerHeight * 0.85;
    if (covers || cls.includes("inset-0")) {
      fixedOverlays.push({
        ...describeEl(el),
        coversViewport: covers,
        blocksClicks:
          s.pointerEvents !== "none" && parseFloat(s.opacity) > 0.05,
      });
    }
  }
  const cx = Math.floor(window.innerWidth / 2);
  const cy = Math.floor(window.innerHeight / 2);
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    elementFromPointCenter: describeEl(document.elementFromPoint(cx, cy)),
    fixedOverlays: fixedOverlays.slice(0, 24),
    pointerEventsNoneLarge: pointerNoneEls.slice(0, 24),
    zIndex50Plus: highZ.slice(0, 32),
    blockingOverlays: fixedOverlays.filter(
      (o) => o.blocksClicks && o.coversViewport
    ),
  };
}

async function dismissLandingIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return;
  await page.waitForTimeout(1200);
  await intro.click({ timeout: 3000 }).catch(() => null);
  await page.keyboard.press("Enter").catch(() => null);
  await page.waitForTimeout(2000);
}

async function runFlow(page, label) {
  const log = { label, steps: [], diagnostics: [] };

  const snap = async (stepName, el = null) => {
    const diag = await page.evaluate((hasEl) => {
      const fixedOverlays = [];
      const pointerNoneEls = [];
      const highZ = [];
      function describeEl(node) {
        if (!node || node.nodeType !== 1) return null;
        const s = getComputedStyle(node);
        const r = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          className: String(node.className || "").slice(0, 160),
          zIndex: s.zIndex,
          pointerEvents: s.pointerEvents,
          cursor: s.cursor,
        };
      }
      for (const node of document.querySelectorAll("*")) {
        const s = getComputedStyle(node);
        const z = parseInt(s.zIndex, 10);
        if (s.pointerEvents === "none") {
          const r = node.getBoundingClientRect();
          if (r.width > 40 && r.height > 40)
            pointerNoneEls.push(describeEl(node));
        }
        if (Number.isFinite(z) && z >= 50) highZ.push(describeEl(node));
        if (s.position !== "fixed" && s.position !== "absolute") continue;
        const r = node.getBoundingClientRect();
        if (
          r.width >= window.innerWidth * 0.85 &&
          r.height >= window.innerHeight * 0.85
        ) {
          fixedOverlays.push({
            ...describeEl(node),
            blocksClicks: s.pointerEvents !== "none",
          });
        }
      }
      const cx = Math.floor(window.innerWidth / 2);
      const cy = Math.floor(window.innerHeight / 2);
      let clickTarget = null;
      if (hasEl) {
        const rect = hasEl.getBoundingClientRect();
        clickTarget = describeEl(
          document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          )
        );
      }
      return {
        clickTarget,
        elementFromPointCenter: describeEl(
          document.elementFromPoint(cx, cy)
        ),
        fixedOverlays: fixedOverlays.slice(0, 12),
        pointerEventsNoneLarge: pointerNoneEls.slice(0, 12),
        zIndex50Plus: highZ.slice(0, 16),
      };
    }, el ? await el.elementHandle() : null);
    log.diagnostics.push({ step: stepName, ...diag });
    log.steps.push({ step: stepName, ok: true });
  };

  await page.goto(BASE, { waitUntil: "load", timeout: 90_000 });
  await dismissLandingIntro(page);
  await snap("landing_after_intro");

  await page.getByRole("button", { name: /로그인|시작/i }).first().click({
    timeout: 8000,
  }).catch(() => null);
  await snap("landing_cta_click");

  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;
  if (!email || !password) {
    log.skippedLogin = "BRICLOG_TEST_EMAIL/PASSWORD not set";
    return log;
  }

  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel(/비밀번호|password/i).fill(password);
  await page.getByRole("button", { name: /^로그인$/i }).last().click();
  await page.waitForTimeout(5000);
  await snap("post_login");

  const brandInput = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
  if (await brandInput.count()) {
    const text = "테스트 브랜드";
    await brandInput.click();
    await brandInput.fill("");
    for (const ch of text) {
      await brandInput.pressSequentially(ch, { delay: 30 });
    }
    const value = await brandInput.inputValue();
    log.brandInputValue = value;
    log.brandInputOk = value.includes("테스트");
    await snap("brand_name_typed", brandInput);
  }

  const blogTab = page.getByRole("button", { name: /블로그/i }).first();
  if (await blogTab.count()) {
    await blogTab.click().catch(() => null);
    await snap("blog_tab", blogTab);
  }
  const instaTab = page.getByRole("button", { name: /인스타/i }).first();
  if (await instaTab.count()) {
    await instaTab.click().catch(() => null);
    await snap("instagram_tab", instaTab);
  }
  const placeTab = page.getByRole("button", { name: /플레이스|스마트플레이스/i }).first();
  if (await placeTab.count()) {
    await placeTab.click().catch(() => null);
    await snap("place_tab", placeTab);
  }

  const logout = page.getByRole("button", { name: /로그아웃/i }).first();
  if (await logout.count()) {
    await logout.click().catch(() => null);
    await snap("logout", logout);
  }

  return log;
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
  const report = { base: BASE, runs: [] };

  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    try {
      report.runs.push(await runFlow(page, vp.name));
    } catch (err) {
      report.runs.push({ label: vp.name, error: err.message });
    }
    await context.close();
  }

  await browser.close();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("=== UI INTERACTION STABILITY ===\n");
  console.log("Report:", OUT);
  for (const run of report.runs) {
    console.log(`\n[${run.label}]`);
    if (run.skippedLogin) {
      console.log(" ", run.skippedLogin);
      continue;
    }
    if (run.error) {
      console.log(" ERROR:", run.error);
      continue;
    }
    console.log(" brand input ok:", run.brandInputOk, "value:", run.brandInputValue);
    const last = run.diagnostics?.[run.diagnostics.length - 1];
    if (last) {
      console.log(" blocking overlays:", last.fixedOverlays?.filter((o) => o.blocksClicks)?.length ?? 0);
      console.log(" center elementFromPoint:", last.elementFromPointCenter?.tag, last.elementFromPointCenter?.className?.slice(0, 60));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
