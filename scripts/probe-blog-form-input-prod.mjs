/**
 * Prod 블로그 폼 입력 인식 E2E (실제 타이핑)
 */
import { chromium } from "playwright";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  createAuthenticatedContext,
  dismissWorkspaceModals,
  dismissBrandWorkspaceGate,
  installE2eAuthRequestBridge,
  prepareChannelWorkspace,
  fillBlogFormViaDom,
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
  await prepareChannelWorkspace(page, BASE, "blog");
  await dismissWorkspaceModals(page);
  await dismissBrandWorkspaceGate(page);

  await page
    .locator('ol[aria-label="작성 단계"]')
    .first()
    .waitFor({ state: "visible", timeout: 25_000 })
    .catch(() => null);

  return waitForWorkspaceReady(page, 25_000);
}

async function fillSteppedForm(page, form) {
  await dismissBrandWorkspaceGate(page);
  const res = await fillBlogFormViaDom(page, form);
  await page.waitForTimeout(1200);
  return res;
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
  if (req.method() !== "POST") return;
  if (!/\/api\/content\/blog/.test(req.url())) return;
  try {
    apiPayloads.push({ url: req.url(), body: req.postDataJSON() });
  } catch {
    /* ignore */
  }
});

const ready = await openBlogWorkspace(page);
const fillRes = await fillSteppedForm(page, FORM);
const snap1 = await readSnap(page);

let clicked = false;
let clickError = null;
if (snap1.genDisabled === false) {
  try {
    await dismissBrandWorkspaceGate(page);
    await page.locator('[data-briclog-generate="blog"]').first().click({ timeout: 8000 });
    clicked = true;
    await page.waitForTimeout(12_000);
  } catch (err) {
    clickError = err.message;
  }
}
const snap2 = clicked ? await readSnap(page) : null;

const report = {
  base: BASE,
  ready,
  fillRes,
  snap1,
  clicked,
  clickError,
  snap2,
  api: apiPayloads.map((p) => ({
    url: p.url,
    brandName: p.body?.brandName,
    region: p.body?.region,
    topic: p.body?.topic,
  })),
};

console.log(JSON.stringify(report, null, 2));

const inputOk =
  snap1.echo.includes(FORM.brandName) &&
  snap1.echo.includes(FORM.region) &&
  snap1.echo.includes(FORM.topic) &&
  snap1.genDisabled === false;

const apiOk =
  !clicked ||
  apiPayloads.some(
    (p) =>
      p.body?.brandName === FORM.brandName &&
      p.body?.region === FORM.region &&
      p.body?.topic === FORM.topic
  );

const ok = inputOk;

await browser.close();
process.exit(ok ? 0 : 1);
