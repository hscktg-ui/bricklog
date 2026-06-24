/**
 * Prod 블로그 폼 입력 인식 E2E (실제 타이핑)
 */
import { chromium } from "playwright";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  createAuthenticatedContext,
  dismissWorkspaceModals,
  installE2eAuthRequestBridge,
  waitForWorkspaceReady,
} from "./lib/e2eAuth.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(root);
applyE2eTestCredentialsToEnv(process.env);

const BASE = process.env.BASE_URL || "https://briclog.ai";
const FORM = {
  brandName: "E2E모닝브루",
  region: "서울 마포",
  topic: "봄 시즌 브런치 메뉴",
};

async function openBlogWorkspace(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  await page.waitForTimeout(2000);

  const blogNav = page
    .locator("nav, aside")
    .getByRole("button", { name: /^이야기$/ })
    .first();
  if (await blogNav.count()) {
    await blogNav.click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
  }

  await dismissWorkspaceModals(page);
  const gateBlank = page.getByRole("button", { name: /빈 브랜드로 시작/i });
  if (await gateBlank.count()) {
    await gateBlank.click({ timeout: 8000 });
    await page.waitForTimeout(800);
  }

  const ready = await waitForWorkspaceReady(page, 25_000);
  await page
    .locator('ol[aria-label="작성 단계"]')
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => null);
  return ready;
}

async function fillSteppedForm(page, form) {
  const steps = page.locator('ol[aria-label="작성 단계"] button');
  await steps.nth(0).click();
  await page.getByPlaceholder(/매장·브랜드|팀 이름/i).fill(form.brandName);
  await page.waitForTimeout(400);
  await steps.nth(1).click();
  await page.getByPlaceholder(/서울 마포|경기 용인/i).fill(form.region);
  await page.waitForTimeout(400);
  await steps.nth(2).click();
  await page.getByPlaceholder(/오늘 전하고|이야기|장면/i).fill(form.topic);
  await page.waitForTimeout(1200);
}

async function readSnap(page) {
  return page.evaluate(() => {
    const echo =
      [...document.querySelectorAll('[role="status"]')]
        .map((n) => n.textContent || "")
        .find((t) => t.includes("입력 확인")) || "";
    const gen = document.querySelector('[data-briclog-generate="blog"]');
    const vals = {};
    for (const el of document.querySelectorAll("input, textarea")) {
      const ph = el.placeholder || "";
      if (/매장·브랜드|팀 이름/.test(ph)) vals.brand = el.value;
      if (/서울 마포|경기 용인/.test(ph)) vals.region = el.value;
      if (/오늘 전하고|이야기|장면/.test(ph)) vals.topic = el.value;
    }
    return {
      echo: echo.replace(/\s+/g, " ").trim(),
      genDisabled: gen?.disabled ?? null,
      stepDone: document.body.innerText.match(/(\d)\/3/)?.[0] || null,
      visibleVals: vals,
      withhold: /브랜드 · 지역 · 주제/.test(document.body.innerText || ""),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const ctxRes = await createAuthenticatedContext(browser, BASE);
if (!ctxRes.ok) {
  console.error("AUTH_FAIL", ctxRes.reason);
  process.exit(1);
}

const page = await ctxRes.context.newPage();
await installE2eAuthRequestBridge(page, BASE);

const apiPayloads = [];
page.on("request", (req) => {
  if (req.method() === "POST" && /\/api\/content\/blog/.test(req.url())) {
    try {
      apiPayloads.push(req.postDataJSON());
    } catch {
      /* ignore */
    }
  }
});

const ready = await openBlogWorkspace(page);
await fillSteppedForm(page, FORM);
const snap1 = await readSnap(page);

let clicked = false;
if (snap1.genDisabled === false) {
  await page.locator('[data-briclog-generate="blog"]').first().click();
  clicked = true;
  await page.waitForTimeout(6000);
}
const snap2 = clicked ? await readSnap(page) : null;

const report = {
  base: BASE,
  ready,
  snap1,
  clicked,
  snap2,
  api: apiPayloads.map((p) => ({
    brandName: p.brandName,
    region: p.region,
    topic: p.topic,
  })),
};

console.log(JSON.stringify(report, null, 2));

const ok =
  snap1.echo.includes(FORM.brandName) &&
  snap1.echo.includes(FORM.region) &&
  snap1.echo.includes(FORM.topic) &&
  snap1.genDisabled === false &&
  (!clicked ||
    (apiPayloads[0]?.brandName === FORM.brandName &&
      apiPayloads[0]?.region === FORM.region &&
      apiPayloads[0]?.topic === FORM.topic));

await browser.close();
process.exit(ok ? 0 : 1);
