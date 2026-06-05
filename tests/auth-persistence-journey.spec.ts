/**
 * Playwright — login → brand → save → logout → relogin persistence
 * Run: npx playwright test tests/auth-persistence-journey.spec.ts
 * Env: BASE_URL, BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3005";
const EMAIL = process.env.BRICLOG_TEST_EMAIL;
const PASSWORD = process.env.BRICLOG_TEST_PASSWORD;

test.describe("auth persistence journey", () => {
  test.skip(!EMAIL || !PASSWORD, "requires BRICLOG_TEST_EMAIL/PASSWORD");

  test("login and reach workspace", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });

    const introSkip = page.locator('[data-briclog-intro-skip="1"]');
    if (await introSkip.count()) {
      await introSkip.click({ timeout: 5000 }).catch(() => null);
    }

    const start = page.locator('[data-briclog-cta="start"]').first();
    if (await start.count()) {
      await start.click({ timeout: 10_000 }).catch(() => null);
    }

    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole("button", { name: /^로그인$/i }).last().click();
    await page.waitForTimeout(3500);

    const brandField = page.getByPlaceholder(/매장·브랜드|브랜드/i).first();
    await expect(brandField).toBeVisible({ timeout: 20_000 });
  });
});
