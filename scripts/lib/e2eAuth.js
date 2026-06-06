/**
 * Playwright E2E — Supabase 세션 주입 공통
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  ensureE2eTestUser,
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "../ensure-e2e-test-user.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

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

export async function prepareE2eAuth(baseUrl) {
  const ensured = await ensureE2eTestUser();
  if (!ensured.ok) {
    return { ok: false, reason: ensured.reason };
  }
  process.env.BRICLOG_TEST_EMAIL = ensured.email;
  process.env.BRICLOG_TEST_PASSWORD = ensured.password;

  const session = await buildSupabasePlaywrightStorage(baseUrl);
  if (!session.ok) {
    return { ok: false, reason: session.reason || "session_build_failed" };
  }
  return {
    ok: true,
    email: ensured.email,
    session,
    reused: ensured.reused,
  };
}

export async function createAuthenticatedContext(browser, baseUrl, viewport = { width: 1280, height: 900 }) {
  const auth = await prepareE2eAuth(baseUrl);
  if (!auth.ok) return auth;

  const context = await browser.newContext({ viewport });
  await applySupabaseSessionToContext(context, auth.session);
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("briclog-intro-session-done", "1");
    } catch {
      /* ignore */
    }
  });
  return { ok: true, context, auth };
}

export async function dismissWorkspaceModals(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (await intro.count()) {
    const skip = page.locator('[data-briclog-intro-skip="1"]');
    if (await skip.count()) await skip.click({ timeout: 5000 }).catch(() => null);
  }
  const welcome = page.getByRole("button", { name: /건너뛰기|시작하기/i });
  if (await welcome.count()) {
    await welcome.first().click({ timeout: 5000 }).catch(() => null);
  }
  const profileLater = page.getByRole("button", { name: /나중에/i });
  if (await profileLater.count()) {
    await profileLater.first().click({ timeout: 5000 }).catch(() => null);
  }
  await page.waitForTimeout(600);
}

/** @returns {Promise<{ ok: boolean, token?: string, email?: string, reason?: string }>} */
export async function getE2eBearerToken() {
  loadEnvLocal();
  const ensured = await ensureE2eTestUser();
  if (!ensured.ok) return { ok: false, reason: ensured.reason };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, reason: "missing_supabase_anon" };
  }

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: ensured.email,
    password: ensured.password,
  });
  if (error || !data?.session?.access_token) {
    return { ok: false, reason: `sign_in:${error?.message || "no_session"}` };
  }
  return { ok: true, token: data.session.access_token, email: ensured.email };
}

/** React controlled input — Playwright fill만으로는 버튼이 안 풀리는 경우 대비 */
export async function fillBlogFormViaDom(page, form) {
  return page.evaluate((f) => {
    const fire = (el, value) => {
      if (!el) return false;
      const proto =
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };

    const byLabel = (text) => {
      for (const label of document.querySelectorAll("label")) {
        const head = label.querySelector("span")?.textContent?.trim() || "";
        if (!head.startsWith(text)) continue;
        const input = label.querySelector("input, textarea");
        if (input) return input;
      }
      return null;
    };

    const results = {
      brand: fire(byLabel("브랜드명"), f.brandName || ""),
      region: fire(byLabel("지역"), f.region || ""),
      topic: fire(byLabel("오늘의 주제"), f.topic || ""),
    };
    return results;
  }, form);
}

export async function isWorkspaceReady(page) {
  const brand = await page
    .getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i)
    .first()
    .count()
    .catch(() => 0);
  const generate = await page.locator('[data-briclog-generate="blog"]').count().catch(() => 0);
  return brand > 0 || generate > 0;
}
