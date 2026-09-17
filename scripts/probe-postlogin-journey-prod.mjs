/**
 * Prod journey check: guest landing → (auth) workspace Today → admin gate/console signals
 * Run: node scripts/probe-postlogin-journey-prod.mjs
 */
import { chromium } from "playwright";
import {
  ensureE2eTestUser,
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "./ensure-e2e-test-user.mjs";
import { dismissBrandWorkspaceGate } from "./lib/e2eAuth.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL || "https://briclog.ai";

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

const report = { base: BASE, at: new Date().toISOString(), checks: [] };

function push(id, ok, detail = "") {
  report.checks.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${id}]${detail ? ` ${detail}` : ""}`);
}

async function main() {
  loadEnvLocal();

  const health = await fetch(`${BASE}/api/content/status`, {
    signal: AbortSignal.timeout(20_000),
  })
    .then(async (r) => ({ ok: r.ok, ...(await r.json()) }))
    .catch((e) => ({ ok: false, error: e.message }));
  push("api_health", Boolean(health.ok), health.error || `llm=${health.llmAvailable}`);

  const homeHtml = await fetch(BASE).then((r) => r.text());
  push("guest_cta_ssr", homeHtml.includes('data-briclog-cta="start"'));
  push(
    "guest_sample_ssr",
    homeHtml.includes("landing-sample") || homeHtml.includes("public-brand-test")
  );
  push(
    "guest_pricing_ssr",
    homeHtml.includes("landing-pricing") || homeHtml.includes("landing-pricing-seo")
  );

  const adminHtml = await fetch(`${BASE}/admin`).then((r) => r.text());
  push("admin_route", adminHtml.length > 500, `bytes=${adminHtml.length}`);

  let chromiumLib;
  try {
    ({ chromium: chromiumLib } = await import("playwright"));
  } catch {
    push("playwright", false, "not installed");
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromiumLib.launch({ headless: true });

  // Guest landing (client hydrate)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector('[data-briclog-cta="start"]', { timeout: 30_000 }).catch(() => null);
    await page.waitForTimeout(2500);
    const guest = await page.evaluate(() => ({
      cta: document.querySelectorAll('[data-briclog-cta="start"]').length,
      sample: document.querySelectorAll("#landing-sample, #landing-sample-seo, #public-brand-test, [data-briclog-anchor='sample']").length,
      pricing: document.querySelectorAll("#landing-pricing, #landing-pricing-seo, #pricing, [data-briclog-anchor='pricing']").length,
      h1: document.querySelector("h1")?.textContent?.trim()?.slice(0, 80) || "",
    }));
    push("guest_cta_live", guest.cta > 0, `count=${guest.cta}`);
    push("guest_sample_live", guest.sample > 0, `count=${guest.sample}`);
    push("guest_pricing_live", guest.pricing > 0, `count=${guest.pricing}`);
    push("guest_h1_live", Boolean(guest.h1), guest.h1);
    await ctx.close();
  }

  // Logged-in Today workspace
  {
    const ensured = await ensureE2eTestUser();
    push("e2e_user", ensured.ok, ensured.reason || ensured.email || "");
    if (ensured.ok) {
      process.env.BRICLOG_TEST_EMAIL = ensured.email;
      process.env.BRICLOG_TEST_PASSWORD = ensured.password;
    }
    const session = await buildSupabasePlaywrightStorage(BASE);
    push("e2e_session", session.ok, session.reason || session.email || "");

    if (session.ok) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await applySupabaseSessionToContext(ctx, session);
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(4000);
      await dismissBrandWorkspaceGate(page);

      const workspace = await page.evaluate(() => {
        const text = document.body?.innerText || "";
        return {
          todaySurface: Boolean(document.querySelector('[data-briclog-surface="today"]')),
          welcomeSurface: Boolean(document.querySelector('[data-briclog-surface="welcome"]')),
          hasTodayLabel: /Today|오늘/.test(text),
          hasCta: /이야기 쓰기|이어 만들기|쓰세요/.test(text),
          hasSidebar: Boolean(document.querySelector('nav[aria-label="작업 메뉴"]')),
          hasBottomNav: Boolean(document.querySelector('nav[aria-label="채널 바로가기"]')),
          stillLanding: Boolean(document.querySelector("#trend-search, #landing-main")),
        };
      });

      push(
        "postlogin_workspace",
        workspace.todaySurface ||
          workspace.welcomeSurface ||
          (workspace.hasSidebar && !workspace.stillLanding),
        JSON.stringify(workspace)
      );
      push(
        "postlogin_today_or_cta",
        workspace.todaySurface || workspace.welcomeSurface || workspace.hasCta,
        workspace.todaySurface
          ? "today_scene"
          : workspace.welcomeSurface
            ? "welcome_scene"
            : workspace.hasCta
              ? "cta_copy"
              : "missing"
      );

      // Primary CTA click if Today scene
      if (workspace.todaySurface || workspace.welcomeSurface) {
        const btn = page.getByRole("button", { name: /이야기 쓰기|이어 만들기/i }).first();
        if (await btn.count()) {
          await btn.click({ timeout: 8000 }).catch(() => null);
          await page.waitForTimeout(1500);
          await dismissBrandWorkspaceGate(page);
          const after = await page.evaluate(() => ({
            leftToday: !document.querySelector('[data-briclog-surface="today"]'),
            hasGenerate:
              /이야기 쓰기|만들기|생성/.test(document.body?.innerText || "") ||
              Boolean(document.querySelector("textarea, [data-briclog-cta]")),
          }));
          push("postlogin_cta_works", after.leftToday || after.hasGenerate, JSON.stringify(after));
        } else {
          push("postlogin_cta_works", false, "no_primary_button");
        }
      } else {
        // Navigate Review from sidebar to prove IA works
        const reviewBtn = page.getByRole("button", { name: /Review|검수/i }).first();
        if (await reviewBtn.count()) {
          await reviewBtn.click({ timeout: 8000 }).catch(() => null);
          await page.waitForTimeout(1000);
          await dismissBrandWorkspaceGate(page);
          const reviewOk =
            (await page.locator('[data-briclog-surface="review"]').count()) > 0 ||
            (await page.getByRole("heading", { name: /Review|붙여넣기 검수/i }).count()) > 0;
          push("postlogin_review_nav", reviewOk);
        } else {
          push("postlogin_review_nav", false, "review_button_missing");
        }
      }

      // Admin route while logged in
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(3500);
      const admin = await page.evaluate(() => {
        const text = document.body?.innerText || "";
        return {
          gate: /운영자|관리자|로그인|접근/.test(text),
          todayHeadline: text.includes("오늘 해야 할 일"),
          commandCenter: Boolean(document.querySelector('[data-briclog-admin="command-center"]')),
          trendStrip: Boolean(document.querySelector('[data-briclog-admin="trend-strip"]')),
          sectionToday: /Today|Inflow|Quality|System/.test(text),
          denied: /운영자 목록|권한이 없|허용되지/.test(text),
        };
      });
      push(
        "admin_console_or_gate",
        admin.todayHeadline || admin.commandCenter || admin.gate || admin.denied,
        JSON.stringify(admin)
      );
      push(
        "admin_editorial_signals",
        admin.denied
          ? true // e2e user may not be admin — gate is valid
          : admin.todayHeadline || admin.commandCenter || admin.sectionToday,
        admin.denied ? "non_admin_gate_ok" : JSON.stringify(admin)
      );

      await ctx.close();
    }
  }

  await browser.close();

  const failed = report.checks.filter((c) => !c.ok);
  console.log("\n=== POSTLOGIN JOURNEY PROD ===");
  console.log(`pass ${report.checks.length - failed.length} / fail ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`- ${f.id}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
