/**
 * Playwright E2E — Supabase 세션 주입 공통
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  ensureE2eTestUser,
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "../ensure-e2e-test-user.mjs";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

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
  const welcome = page.getByRole("button", { name: /바로 보기|바로 둘러보기|글쓰기 시작|닫기|시작하기/i });
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
  loadEnvLocal(root);
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
      if (ch === "place") {
        return {
          headline: fire(byLabel("공지 한 줄"), f.placeHeadline || ""),
        };
      }
      return {};
    },
    { ch: channel, f: form }
  );
}

/** API로 브랜드 확보 후 사이드바에서 선택 — 채널 단독 생성 필수 */
export async function ensureSmokeBrand(page, baseUrl, form) {
  await syncE2eSessionToPage(page, baseUrl);
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

  await syncE2eSessionToPage(page, baseUrl);
  return { ok: true, brandId: brand.id, brandName: form.brandName };
}

/** 브랜드 → 지역 → 주제 순서형(SteppedWriteFields) 폼 채우기 */
export async function fillBlogSteppedFormViaDom(page, form) {
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
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    };
    const stepButtons = [
      ...document.querySelectorAll('ol[aria-label="작성 단계"] button'),
    ];
    const clickStep = (index) => {
      if (stepButtons[index]) {
        stepButtons[index].click();
        return true;
      }
      return false;
    };
    const fillByPlaceholder = (re, value) => {
      if (!value) return false;
      for (const el of document.querySelectorAll("input, textarea")) {
        const ph = el.placeholder || "";
        if (!re.test(ph)) continue;
        return fire(el, value);
      }
      return false;
    };

    clickStep(0);
    const brandOk = fillByPlaceholder(/매장·브랜드|팀 이름/i, f.brandName || "");
    clickStep(1);
    const regionOk =
      fillByPlaceholder(/서울 마포|용인|지역/i, f.region || "") ||
      fillByPlaceholder(/예:/i, f.region || "");
    clickStep(2);
    const topicOk = fillByPlaceholder(/오늘 전하고|이야기|장면/i, f.topic || "");

    if (f.industry) {
      for (const btn of document.querySelectorAll("button")) {
        if (btn.textContent?.trim() === f.industry) {
          btn.click();
          break;
        }
      }
    }

    const done = [f.brandName, f.region, f.topic].filter(Boolean).length;
    const filled = [brandOk, regionOk, topicOk].filter(Boolean).length;
    return { brandOk, regionOk, topicOk, filled, done };
  }, form);
}

export async function fillBlogFormViaDom(page, form) {
  const stepped = await fillBlogSteppedFormViaDom(page, form);
  if (stepped.filled >= stepped.done) return stepped;

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
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    };

    const byLabel = (text) => {
      for (const label of document.querySelectorAll("label")) {
        const head =
          label.querySelector("span")?.textContent?.trim() ||
          label.textContent?.trim() ||
          "";
        if (!head.includes(text)) continue;
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

    return {
      brand: fire(byLabel("브랜드명"), f.brandName || ""),
      region: fire(byLabel("지역"), f.region || ""),
      topic: fire(byLabel("오늘의 주제"), f.topic || ""),
      industry: f.industry ? clickChip(f.industry) : false,
      stepped: f.stepped,
    };
  }, { ...form, stepped });
}

export async function isWorkspaceReady(page) {
  const generate = await page
    .locator(
      '[data-briclog-generate="blog"], [data-briclog-generate="place"], [data-briclog-generate="insta"], [data-briclog-generate="image"]'
    )
    .count()
    .catch(() => 0);
  if (generate > 0) return true;

  const landingMarker = await page.getByText(/본문 바로가기/).count().catch(() => 0);
  if (landingMarker > 0) return false;

  const brandLabel = await page.getByLabel(/^브랜드명$/).count().catch(() => 0);
  const brandPh = await page
    .getByPlaceholder(/매장·브랜드|브랜드|팀 이름/i)
    .first()
    .count()
    .catch(() => 0);
  const workspaceNav = await page
    .locator('nav, [aria-label*="메뉴"], aside')
    .getByRole("button", { name: /^이야기$|^플레이스$|^인스타$|^썸네일|^운영|^계획/ })
    .count()
    .catch(() => 0);
  const planReady = await page
    .getByText(/운영 계획|이번 주|콘텐츠 계획/)
    .first()
    .count()
    .catch(() => 0);
  if (workspaceNav > 0 && planReady > 0) return true;
  return brandLabel > 0 || brandPh > 0 || workspaceNav > 0;
}

/** Plan 기본 홈 → 채널 작업 화면 이동 */
export async function navigateWorkspaceChannel(page, channel = "blog") {
  const labels = {
    blog: /^이야기$/,
    place: /^플레이스$/,
    insta: /^인스타$/,
    image: /^썸네일/,
    plan: /^운영 계획$|^계획$/,
  };
  const pattern = labels[channel] || labels.blog;
  const btn = page.getByRole("button", { name: pattern }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(700);
  }
}

export async function waitForWorkspaceReady(page, timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await page
      .waitForFunction(
        () => !/작업실을 여는 중/.test(document.body?.innerText || ""),
        undefined,
        { timeout: 2000 }
      )
      .catch(() => null);
    if (await isWorkspaceReady(page)) return { ok: true, reason: "workspace_ready" };
    await page.waitForTimeout(800);
  }
  return { ok: false, reason: "workspace_missing" };
}

/** @param {import('playwright').Page} page */
export async function dismissLoadingOverlay(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
  });
  await page.waitForTimeout(400);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} [timeoutMs=120_000]
 */
export async function waitForWorkspaceGenerateIdle(page, timeoutMs = 120_000) {
  await page
    .waitForFunction(
      () => {
        const busy = /만드는 중|편집본 작성 중|조사·편집|생성 중/.test(
          document.body?.innerText || ""
        );
        if (busy) return false;
        const btns = document.querySelectorAll("[data-briclog-generate]");
        if (btns.length === 0) return true;
        return Array.from(btns).some((b) => !b.disabled);
      },
      null,
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {string} channel
 */
export async function prepareChannelWorkspace(page, baseUrl, channel) {
  await syncE2eSessionToPage(page, baseUrl);
  await dismissLoadingOverlay(page);
  await navigateWorkspaceChannel(page, channel);
  await waitForWorkspaceGenerateIdle(page, 90_000);
  await page
    .waitForSelector(`[data-briclog-generate="${channel}"]`, { timeout: 45_000 })
    .catch(() => {});
}
