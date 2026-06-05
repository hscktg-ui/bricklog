/**
 * Single persona UX debug — dumps DOM signals for smoke failures
 * Run: node --import ./scripts/register-alias.mjs scripts/debug-ux-persona.mjs u009
 */
import { HUNDRED_USER_PERSONAS } from "../lib/qa/hundredUserPersonas.js";
import {
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "./ensure-e2e-test-user.mjs";

const BASE = process.env.BASE_URL || "https://briclog.ai";
const id = process.argv[2] || "u009";
const persona = HUNDRED_USER_PERSONAS.find((p) => p.id === id);
if (!persona) {
  console.error("Unknown persona", id);
  process.exit(1);
}

const session = await buildSupabasePlaywrightStorage(BASE);
if (!session.ok) {
  console.error("Session failed:", session);
  process.exit(1);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: persona.viewport });
await applySupabaseSessionToContext(context, session);
context.setDefaultTimeout(12_000);
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("briclog-intro-session-done", "1");
    localStorage.setItem("briclog-welcome-dismissed-permanent", "1");
  } catch {
    /* ignore */
  }
});
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(4000);

async function openDrawer() {
  const btn = page.getByRole("button", { name: /전체 메뉴/i }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(700);
  }
}

if (persona.primaryMenu) {
  const mobile = persona.device === "mobile" || persona.device === "tablet";
  if (mobile) await openDrawer();
  const map = {
    blog: /이야기/,
    place: /플레이스/,
    insta: /인스타/,
    history: /초안 기록|^기록$/,
    review: /붙여넣기 검수|^검수$/,
    growth: /브랜드 작업실/,
  };
  const pattern = map[persona.primaryMenu];
  if (pattern) {
    const nav = page.locator('nav[aria-label="작업 메뉴"]').first();
    let btn = nav.getByRole("button", { name: pattern }).first();
    if (!(await btn.count())) btn = page.getByRole("button", { name: pattern }).first();
    if (await btn.count()) {
      await btn.click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(1000);
    }
  }
}

const snap = await page.evaluate(() => ({
  url: location.href,
  headings: [...document.querySelectorAll("h1,h2")].map((h) => h.textContent?.trim()).slice(0, 15),
  navButtons: [...document.querySelectorAll('nav[aria-label="작업 메뉴"] button')].map((b) =>
    b.textContent?.replace(/\s+/g, " ").trim()
  ),
  placeholders: [...document.querySelectorAll("textarea,input")].map((el) => el.getAttribute("placeholder")).filter(Boolean),
  drawerOpen: Boolean(document.querySelector('aside[aria-modal="true"]')),
}));

console.log(JSON.stringify({ persona: { id: persona.id, device: persona.device, primaryMenu: persona.primaryMenu, focus: persona.focus }, snap }, null, 2));
await browser.close();
