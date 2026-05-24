/**
 * Playwright UI 인터랙션 안정성 시나리오
 * 실행: npx playwright test tests/ui-interaction-stability.spec.ts
 * (서버: BASE_URL=http://localhost:3005 npm run start:3005)
 */
// @ts-nocheck
import { test, expect } from "playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3005";

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (await intro.count()) {
    await page.waitForTimeout(1200);
    await intro.click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(2000);
  }
}

function diagnoseInPage() {
  const fixedOverlays = [];
  const pointerNoneEls = [];
  const highZ = [];
  function describeEl(el) {
    if (!el || el.nodeType !== 1) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: String(el.className || "").slice(0, 120),
      zIndex: s.zIndex,
      pointerEvents: s.pointerEvents,
      cursor: s.cursor,
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
    if (r.width >= window.innerWidth * 0.85 && r.height >= window.innerHeight * 0.85) {
      fixedOverlays.push({
        ...describeEl(el),
        blocksClicks: s.pointerEvents !== "none",
      });
    }
  }
  const cx = Math.floor(window.innerWidth / 2);
  const cy = Math.floor(window.innerHeight / 2);
  return {
    elementFromPointCenter: describeEl(document.elementFromPoint(cx, cy)),
    fixedOverlays: fixedOverlays.slice(0, 12),
    pointerEventsNoneLarge: pointerNoneEls.slice(0, 12),
    zIndex50Plus: highZ.slice(0, 16),
  };
}

test.describe("ui-interaction-stability", () => {
  test.use({ baseURL: BASE });

  test("desktop flow", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissIntro(page);

    const landingBtn = page.getByRole("button", { name: /로그인|시작/i }).first();
    await expect(landingBtn).toBeVisible({ timeout: 15_000 });
    const diag1 = await page.evaluate(diagnoseInPage);
    console.log("[diagnostic landing]", JSON.stringify(diag1, null, 2));

    const email = process.env.BRICLOG_TEST_EMAIL;
    const password = process.env.BRICLOG_TEST_PASSWORD;
    test.skip(!email || !password, "BRICLOG_TEST_EMAIL/PASSWORD required");

    await landingBtn.click();
    await page.getByLabel(/이메일|email/i).fill(email);
    await page.getByLabel(/비밀번호|password/i).fill(password);
    await page.getByRole("button", { name: /^로그인$/i }).last().click();
    await page.waitForTimeout(5000);

    const brandInput = page.getByPlaceholder(/매장·브랜드/i).first();
    await brandInput.click();
    await brandInput.fill("");
    await brandInput.pressSequentially("테스트 브랜드", { delay: 35 });
    await expect(brandInput).toHaveValue(/테스트/);

    const diag2 = await page.evaluate(diagnoseInPage);
    console.log("[diagnostic after brand type]", JSON.stringify(diag2, null, 2));
    const blocking =
      diag2.fixedOverlays?.filter((o) => o.blocksClicks)?.length ?? 0;
    expect(blocking).toBeLessThan(2);
  });

  test("mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissIntro(page);
    const diag = await page.evaluate(diagnoseInPage);
    console.log("[diagnostic mobile landing]", JSON.stringify(diag, null, 2));
  });
});
