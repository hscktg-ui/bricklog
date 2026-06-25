import { chromium } from "playwright";
import { createAuthenticatedContext, dismissWorkspaceModals, waitForWorkspaceReady } from "./lib/e2eAuth.js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(root);
applyE2eTestCredentialsToEnv(process.env);

const errs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await createAuthenticatedContext(browser, "https://briclog.ai");
const page = await ctx.context.newPage();
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text().slice(0, 400));
});

await page.goto("https://briclog.ai", { waitUntil: "domcontentloaded", timeout: 90_000 });
const dpl = await page.content().then((h) => (h.match(/dpl_[A-Za-z0-9]+/) || [])[0]);
console.log("dpl:", dpl);
await dismissWorkspaceModals(page);
await page.waitForTimeout(8000);

const snap = await page.evaluate(() => ({
  error: /잠시 연결이 끊겼습니다/.test(document.body?.innerText || ""),
  nav: Boolean(document.querySelector('nav[aria-label="작업 메뉴"]')),
}));
const ready = await waitForWorkspaceReady(page, 20_000);
console.log(JSON.stringify({ snap, ready, errs: errs.slice(0, 3) }, null, 2));
await browser.close();
