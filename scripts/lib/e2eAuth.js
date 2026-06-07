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

/** 브라우저 storage와 Supabase 클라이언트(localStorage) 동기화 */
export async function syncE2eSessionToPage(page, baseUrl) {
  const auth = await prepareE2eAuth(baseUrl);
  if (!auth.ok) return auth;
  await page.evaluate(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    { key: auth.session.storageKey, value: auth.session.tokenValue }
  );
  return { ok: true, email: auth.email };
}

/**
 * Playwright — fetchWithAuth 토큰 갱신 레이스 대비, API 요청에 fresh Bearer 주입
 * @param {import('playwright').Page} page
 * @param {string} [baseUrl]
 */
export async function installE2eAuthRequestBridge(page, baseUrl = "") {
  const origin = String(baseUrl || "").replace(/\/$/, "");
  const pattern = origin ? `${origin}/api/**` : "**/api/**";
  await page.route(pattern, async (route) => {
    const url = route.request().url();
    if (/\/api\/public\//.test(url)) {
      await route.continue();
      return;
    }
    const tokenRes = await getE2eBearerToken();
    if (!tokenRes.ok) {
      await route.continue();
      return;
    }
    const headers = {
      ...route.request().headers(),
      authorization: `Bearer ${tokenRes.token}`,
    };
    await route.continue({ headers });
  });
}

export async function createAuthenticatedContext(browser, baseUrl, viewport = { width: 1280, height: 900 }) {
  const auth = await prepareE2eAuth(baseUrl);
  if (!auth.ok) return auth;

  const context = await browser.newContext({
    viewport,
    storageState: auth.session.storageState,
  });
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
  const idleHintClose = page
    .locator("div")
    .filter({ hasText: /맞춤 개인화|계정 습관/ })
    .getByRole("button", { name: "닫기" })
    .first();
  if (await idleHintClose.count()) {
    await idleHintClose.click({ timeout: 3000 }).catch(() => null);
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
/** 채널 단독 폼 — 인스타(오늘의 소재)·이미지(주제 직접 입력) */
export async function fillChannelFormViaDom(page, channel, form) {
  return page.evaluate(
    ({ ch, f }) => {
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
        el.dispatchEvent(new Event("blur", { bubbles: true }));
        return true;
      };

      const byLabel = (text) => {
        for (const label of document.querySelectorAll("label")) {
          const head = label.textContent?.trim() || "";
          if (!head.includes(text)) continue;
          const input = label.querySelector("input, textarea");
          if (input) return input;
        }
        return null;
      };

      if (ch === "insta") {
        return {
          topic: fire(byLabel("오늘의 소재"), f.topic || ""),
          scene: fire(byLabel("장면 한 줄"), f.instaScene || ""),
        };
      }
      if (ch === "image") {
        return { topic: fire(byLabel("주제 (직접 입력)"), f.topic || "") };
      }
      return {};
    },
    { ch: channel, f: form }
  );
}

/** API로 브랜드 확보 후 사이드바에서 선택 — 채널 단독 생성 필수 */
export async function ensureSmokeBrand(page, baseUrl, form) {
  const tokenRes = await getE2eBearerToken();
  if (!tokenRes.ok) return { ok: false, reason: tokenRes.reason };

  const headers = {
    Authorization: `Bearer ${tokenRes.token}`,
    "Content-Type": "application/json",
  };
  const listRes = await fetch(`${baseUrl}/api/brands`, { headers });
  const listBody = await listRes.json().catch(() => ({}));
  const brands = listBody.brands || listBody.data?.brands || [];
  let brand = brands.find((b) => b.brandName === form.brandName);

  if (!brand) {
    const createRes = await fetch(`${baseUrl}/api/brands`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        brandName: form.brandName,
        region: form.region || "전국",
        industry: "기타",
        metadata: {},
      }),
    });
    const createBody = await createRes.json().catch(() => ({}));
    brand = createBody.brand || createBody.data?.brand;
    if (!brand?.id) {
      return { ok: false, reason: "brand_create_failed" };
    }
  }

  const switcher = page
    .getByRole("button", { name: /브랜드 목록 펼치기|브랜드를 선택해 주세요/i })
    .first();
  if (await switcher.count()) {
    await switcher.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(400);
    const pick = page.getByRole("button", { name: form.brandName }).first();
    if (await pick.count()) {
      await pick.click({ timeout: 8000 });
      await page.waitForTimeout(600);
    }
  }

  return { ok: true, brandId: brand.id, brandName: form.brandName };
}

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

    const clickChip = (text) => {
      for (const btn of document.querySelectorAll("button")) {
        if (btn.textContent?.trim() === text) {
          btn.click();
          return true;
        }
      }
      return false;
    };

    const results = {
      brand: fire(byLabel("브랜드명"), f.brandName || ""),
      region: fire(byLabel("지역"), f.region || ""),
      topic: fire(byLabel("오늘의 주제"), f.topic || ""),
      industry: f.industry ? clickChip(f.industry) : false,
    };
    return results;
  }, form);
}

export async function isWorkspaceReady(page) {
  const brandLabel = await page.getByLabel(/^브랜드명$/).count().catch(() => 0);
  const brandPh = await page
    .getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i)
    .first()
    .count()
    .catch(() => 0);
  const generate = await page
    .locator(
      '[data-briclog-generate="blog"], [data-briclog-generate="place"], [data-briclog-generate="insta"], [data-briclog-generate="image"]'
    )
    .count()
    .catch(() => 0);
  const storyNav = await page
    .getByRole("button", { name: /이야기/ })
    .count()
    .catch(() => 0);
  return brandLabel > 0 || brandPh > 0 || generate > 0 || storyNav > 0;
}

export async function waitForWorkspaceReady(page, timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isWorkspaceReady(page)) return { ok: true, reason: "workspace_ready" };
    await page.waitForTimeout(800);
  }
  return { ok: false, reason: "workspace_missing" };
}
