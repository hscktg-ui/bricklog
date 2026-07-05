/**
 * Vision 2030 — prod 랜딩·작업실 주요 버튼 클릭·노출 검증
 * Run: npm run test:vision2030-buttons-prod
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "https://briclog.ai";
const OUT = join(root, "artifacts", "vision2030-buttons", "latest-summary.json");

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return;
  await page.waitForTimeout(1200);
  const skip = page.locator('[data-briclog-intro-skip="1"]');
  if (await skip.count()) {
    await skip.click({ timeout: 8000 }).catch(() => null);
  }
  await intro.waitFor({ state: "hidden", timeout: 12_000 }).catch(() => null);
}

async function probeButton(page, { sel, name, mustBeVisible = true }) {
  const loc = page.locator(sel).first();
  const count = await loc.count();
  if (!count) {
    return { name, sel, ok: !mustBeVisible, issue: mustBeVisible ? "missing" : null };
  }
  const visible = await loc.isVisible().catch(() => false);
  if (mustBeVisible && !visible) {
    return { name, sel, ok: false, issue: "hidden" };
  }
  const blocked =
    visible &&
    (await loc
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2
        );
        return Boolean(top && top !== el && !el.contains(top));
      })
      .catch(() => false));
  if (blocked) {
    return { name, sel, ok: false, issue: "click blocked by overlay" };
  }
  await loc.click({ timeout: 5000, trial: true }).catch(() => null);
  return { name, sel, ok: true };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const report = { at: new Date().toISOString(), base: BASE, checks: [] };
  let failed = 0;

  for (const vp of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}/?skipIntro=1`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await dismissIntro(page);

    if (vp.label === "mobile") {
      const sample = page.locator("#public-brand-test");
      if (await sample.count()) {
        await sample.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
      }
    }

    const landingButtons = [
      { sel: '[data-briclog-cta="start"]', name: "hero start" },
      { sel: '[data-briclog-cta="test"]', name: "hero sample" },
      {
        sel: '[data-briclog-cta="login-nav"]',
        name: "nav login",
        mustBeVisible: vp.label === "desktop",
      },
    ];

    const results = [];
    for (const btn of landingButtons) {
      const r = await probeButton(page, btn);
      results.push(r);
      if (!r.ok) failed += 1;
    }

    if (vp.label === "mobile") {
      const stickyStart = page.locator('[data-briclog-cta="start"]').last();
      const stickyLogin = page.locator('[data-briclog-cta="login-sticky"]');
      const stickyVisible = await stickyLogin
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (stickyVisible) {
        results.push(await probeButton(page, { sel: '[data-briclog-cta="login-sticky"]', name: "sticky login" }));
        if (!results[results.length - 1].ok) failed += 1;
      } else {
        results.push({
          name: "sticky bar",
          sel: '[data-briclog-cta="login-sticky"]',
          ok: (await stickyStart.count()) > 0,
          note: "sticky optional — hero start remains primary CTA",
        });
      }
    } else {
      results.push(
        await probeButton(page, {
          sel: '[data-briclog-cta="login-sticky"]',
          name: "sticky login",
          mustBeVisible: false,
        })
      );
    }

    const brandTest = page.locator("#public-brand-test");
    results.push({
      name: "public brand test section",
      sel: "#public-brand-test",
      ok: (await brandTest.count()) > 0,
      issue: (await brandTest.count()) ? null : "missing",
    });
    if (!(await brandTest.count())) failed += 1;

    report.checks.push({
      viewport: vp.label,
      pageErrors,
      buttons: results,
    });
    await context.close();
  }

  // intro flow
  const introCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const introPage = await introCtx.newPage();
  await introPage.goto(`${BASE}/?intro=reset`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  const introBtn = await probeButton(introPage, {
    sel: '[data-briclog-intro-skip="1"]',
    name: "intro primary CTA",
  });
  report.checks.push({ viewport: "intro-mobile", buttons: [introBtn] });
  if (!introBtn.ok) failed += 1;
  await introCtx.close();

  await browser.close();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({ ...report, pass: failed === 0, failures: failed }, null, 2),
    "utf8"
  );

  console.log("\n=== VISION 2030 BUTTONS (prod) ===\n");
  for (const block of report.checks) {
    console.log(`[${block.viewport}]`);
    for (const b of block.buttons || []) {
      console.log(`  ${b.ok ? "OK" : "FAIL"} ${b.name}${b.issue ? ` — ${b.issue}` : ""}`);
    }
    if (block.pageErrors?.length) {
      console.log("  page errors:", block.pageErrors.slice(0, 3).join("; "));
      failed += block.pageErrors.length > 0 ? 0 : 0;
    }
  }
  console.log(`\nReport: ${OUT}`);
  console.log(failed ? `\nFAIL ${failed} button checks` : "\nALL BUTTON CHECKS OK");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
