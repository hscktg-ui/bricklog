/**
 * Prod — 자동저장(초안) 복원 후 재입력 없이 생성
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
  waitForWorkspaceGenerateIdle,
} from "./lib/e2eAuth.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(root);
applyE2eTestCredentialsToEnv(process.env);

const BASE = process.env.BASE_URL || "https://briclog.ai";
const FORM = {
  brandName: "여주목마",
  region: "여주",
  topic: "수영장 오픈소식 직접 다녀온 후기",
};

function draftKey(userId, brandId) {
  return `briclog-form-draft-v2-${userId}-${brandId}`;
}

async function readSnap(page) {
  return page.evaluate(() => {
    const echo =
      [...document.querySelectorAll('[role="status"]')]
        .map((n) => n.textContent || "")
        .find((t) => t.includes("입력 확인")) || "";
    const gen = document.querySelector('[data-briclog-generate="blog"]');
    const body = document.body.innerText || "";
    const err =
      body.match(/전달 과정에서 값이 빠졌|브랜드 · 지역 · 주제를 모두/)?.[0] ||
      null;
    const sections = document.querySelectorAll(
      '[data-briclog-blog-section], article h2, .blog-section'
    ).length;
    return {
      echo: echo.replace(/\s+/g, " ").trim(),
      genDisabled: gen?.disabled ?? null,
      err,
      sectionHints: sections,
      hasGenerating: /조사|작성|검수/.test(body),
    };
  });
}

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
const fillRes = await fillBlogFormViaDom(page, FORM);
await page.waitForTimeout(3500);

const seedMeta = await page.evaluate((form) => {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith("briclog-form-draft-v2-")
  );
  const drafts = keys.map((k) => {
    try {
      return { key: k, data: JSON.parse(localStorage.getItem(k) || "{}") };
    } catch {
      return { key: k, data: null };
    }
  });
  const match = drafts.find(
    (d) =>
      d.data?.brandName === form.brandName &&
      d.data?.region === form.region &&
      d.data?.topic === form.topic
  );
  return { keys, matchedKey: match?.key || null, matched: Boolean(match) };
}, FORM);

await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
await dismissWorkspaceModals(page);
await prepareChannelWorkspace(page, BASE, "blog");
await dismissBrandWorkspaceGate(page);
await waitForWorkspaceReady(page, 25_000);
await waitForWorkspaceGenerateIdle(page, 120_000);
await page
  .locator('ol[aria-label="작성 단계"]')
  .first()
  .waitFor({ state: "visible", timeout: 25_000 })
  .catch(() => null);
await page.waitForTimeout(2200);

const snapAfterReload = await readSnap(page);

let clicked = false;
let clickError = null;
if (snapAfterReload.genDisabled === false) {
  try {
    await dismissBrandWorkspaceGate(page);
    await page.locator('[data-briclog-generate="blog"]').first().click({ timeout: 8000 });
    clicked = true;
    await page.waitForTimeout(45_000);
  } catch (err) {
    clickError = err.message;
  }
}
const snapAfterGen = clicked ? await readSnap(page) : null;

const report = {
  base: BASE,
  ready,
  fillRes,
  seedMeta,
  snapAfterReload,
  clicked,
  clickError,
  snapAfterGen,
  api: apiPayloads.map((p) => ({
    url: p.url,
    brandName: p.body?.brandName,
    region: p.body?.region,
    topic: p.body?.topic,
    stamped: p.body?._verifiedGenerationAxes,
  })),
};

console.log(JSON.stringify(report, null, 2));

const inputOk =
  snapAfterReload.echo.includes(FORM.brandName) &&
  snapAfterReload.echo.includes(FORM.region) &&
  snapAfterReload.echo.includes(FORM.topic) &&
  snapAfterReload.genDisabled === false;

const genOk =
  !clicked ||
  (!snapAfterGen?.err &&
    (snapAfterGen?.sectionHints > 0 || apiPayloads.some((p) => p.body?.brandName)));

const ok = inputOk && genOk;

await browser.close();
process.exit(ok ? 0 : 1);
