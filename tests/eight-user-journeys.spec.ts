/**
 * 8 페르소나 E2E 스모크
 * 실행: npx playwright test tests/eight-user-journeys.spec.ts
 * 서버: BASE_URL=http://localhost:3005 npm run start:3005
 */
// @ts-nocheck
import { test, expect } from "playwright/test";
import { EIGHT_USER_PERSONAS } from "../lib/qa/eightUserPersonas.js";

const BASE = process.env.BASE_URL || "http://localhost:3005";

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return;
  await page.waitForTimeout(1000);
  await intro.click({ timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(1500);
}

function blockingOverlayCount() {
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
}

test.describe("eight-user-journeys", () => {
  test.use({ baseURL: BASE });

  for (const persona of EIGHT_USER_PERSONAS.filter((p) => !p.needsAuth)) {
    test(`${persona.id}: ${persona.label}`, async ({ page }) => {
      if (persona.prep === "markLandingIntroDone") {
        await page.addInitScript(() => {
          try {
            sessionStorage.setItem("briclog-intro-session-done", "1");
          } catch {
            /* ignore */
          }
        });
      }
      if (persona.viewport) {
        await page.setViewportSize(persona.viewport);
      }

      await page.goto("/", { waitUntil: "load", timeout: 90_000 });

      if (persona.prep !== "markLandingIntroDone") {
        await dismissIntro(page);
      } else {
        await expect(page.locator('[aria-label="BRICLOG 소개"]')).toHaveCount(0);
      }

      const blocking = await page.evaluate(blockingOverlayCount);
      expect(blocking).toBeLessThan(2);

      const cta = page.getByRole("button", { name: /로그인|시작/i }).first();
      await expect(cta).toBeVisible({ timeout: 15_000 });
    });
  }

  test("authenticated journeys (optional)", async ({ page }) => {
    const email = process.env.BRICLOG_TEST_EMAIL;
    const password = process.env.BRICLOG_TEST_PASSWORD;
    test.skip(!email || !password, "BRICLOG_TEST_EMAIL/PASSWORD required");

    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissIntro(page);
    await page.getByRole("button", { name: /로그인|시작/i }).first().click();
    await page.getByLabel(/이메일|email/i).fill(email);
    await page.getByLabel(/비밀번호|password/i).fill(password);
    await page.getByRole("button", { name: /^로그인$/i }).last().click();
    await page.waitForTimeout(5000);

    const blocking = await page.evaluate(blockingOverlayCount);
    expect(blocking).toBeLessThan(2);

    const brandInput = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
    if (await brandInput.count()) {
      await brandInput.pressSequentially("테스트 브랜드", { delay: 30 });
      await expect(brandInput).toHaveValue(/테스트/);
    }

    for (const name of [/블로그/i, /인스타/i]) {
      const tab = page.getByRole("button", { name }).first();
      if (await tab.count()) {
        await tab.click({ timeout: 5000 });
        await page.waitForTimeout(400);
      }
    }

    const postSwitch = await page.evaluate(blockingOverlayCount);
    expect(postSwitch).toBeLessThan(2);
  });
});
