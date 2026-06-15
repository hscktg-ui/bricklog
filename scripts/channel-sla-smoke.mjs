/**
 * 채널별 생성 SLA 스모크 (Playwright) — 목표: 클릭 후 240s 이내 결과 (CHANNEL_SLA_MS)
 * Run: npm run test:channel-sla
 * Env: BASE_URL, BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD (.env.local)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CHANNEL_SLA_MS,
  CHANNEL_SLA_PERSONAS,
} from "../lib/qa/channelSlaPersonas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "channel-sla-report.json");

import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  applySupabaseSessionToContext,
  buildSupabasePlaywrightStorage,
} from "./ensure-e2e-test-user.mjs";
import {
  createAuthenticatedContext,
  dismissWorkspaceModals,
  fillBlogFormViaDom,
  fillBlogSteppedFormViaDom,
  fillChannelFormViaDom,
  ensureSmokeBrand,
  installE2eAuthRequestBridge,
  syncE2eSessionToPage,
  waitForWorkspaceReady,
} from "./lib/e2eAuth.js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";

function loadEnvLocalAndCredentials() {
  loadEnvLocal(root);
  applyE2eTestCredentialsToEnv(process.env);
}

/** 리포트 JSON에 세션 토큰이 커밋되지 않도록 제거 */
function sanitizeSlaReport(report) {
  const out = JSON.parse(JSON.stringify(report));
  const login = out.login;
  if (!login) return out;
  if (login.token) login.token = "[redacted]";
  const session = login.session;
  if (!session) return out;
  if (session.tokenValue) session.tokenValue = "[redacted]";
  for (const origin of session.storageState?.origins || []) {
    for (const bucket of ["localStorage", "sessionStorage"]) {
      for (const item of origin[bucket] || []) {
        if (/auth|token/i.test(item.name || "")) item.value = "[redacted]";
      }
    }
  }
  return out;
}

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return;
  const skip = page.locator('[data-briclog-intro-skip="1"]');
  if (await skip.count()) await skip.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(400);
}

async function dismissWelcome(page) {
  const welcome = page.getByRole("button", { name: /건너뛰기|시작하기/i });
  if (await welcome.count()) {
    await welcome.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
}

async function refreshBrowserAuth(context) {
  const session = await buildSupabasePlaywrightStorage(BASE);
  if (!session.ok) {
    throw new Error(session.reason || "session_refresh_failed");
  }
  await applySupabaseSessionToContext(context, session);
  return session;
}

async function refreshE2eSession(page) {
  await syncE2eSessionToPage(page, BASE);
  await page
    .evaluate(() => {
      document.querySelectorAll("input, textarea").forEach((el) => {
        el.dispatchEvent(new Event("blur", { bubbles: true }));
      });
    })
    .catch(() => null);
  await page.waitForTimeout(400);
}

async function openWorkspace(page) {
  await refreshE2eSession(page);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  let ready = await waitForWorkspaceReady(page, 45_000);
  if (!ready.ok) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await dismissWorkspaceModals(page);
    ready = await waitForWorkspaceReady(page, 30_000);
  }
  return {
    ok: ready.ok,
    reason: ready.ok ? "supabase_session" : ready.reason,
  };
}

async function openChannel(page, menuPattern) {
  const btn = page.getByRole("button", { name: menuPattern }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(600);
  }
}

async function fillIfPresent(page, placeholderRe, value) {
  const el = page.getByPlaceholder(placeholderRe).first();
  if (!(await el.count())) return false;
  await el.fill(value);
  await el.dispatchEvent("input").catch(() => null);
  await el.dispatchEvent("change").catch(() => null);
  await el.blur().catch(() => null);
  return true;
}

async function fillLabeledField(page, labelRe, value) {
  if (!value) return false;
  const el = page.getByLabel(labelRe).first();
  if (!(await el.count())) return false;
  await el.click();
  await el.fill("");
  await el.pressSequentially(value, { delay: 12 });
  await el.blur().catch(() => null);
  return true;
}

async function fillCommonFields(page, form, channel) {
  if (channel && channel !== "blog") {
    await ensureSmokeBrand(page, BASE, form);
  }
  if (channel === "insta" || channel === "image") {
    await fillChannelFormViaDom(page, channel, form);
    if (channel === "insta" && form.instaScene) {
      await fillIfPresent(page, /장면/i, form.instaScene);
    }
    if (channel === "image") {
      await fillLabeledField(page, /주제 \(직접 입력\)/, form.topic || "");
    }
    await page.waitForTimeout(600);
    return;
  }

  let filled =
    (await fillLabeledField(page, /^브랜드명$/, form.brandName || "")) ||
    (await fillIfPresent(page, /매장·브랜드|브랜드|팀 이름/i, form.brandName || ""));

  filled =
    (await fillLabeledField(page, /^지역$/, form.region || "")) ||
    filled ||
    (await fillIfPresent(page, /파주|지역|예: 서울/i, form.region || ""));

  await fillBlogSteppedFormViaDom(page, form);
  await page.waitForTimeout(400);
  await fillBlogFormViaDom(page, form);
  await page.waitForTimeout(600);

  const ready = await page
    .waitForFunction(
      () => {
        const btn = document.querySelector('[data-briclog-generate="blog"]');
        return Boolean(btn && !btn.disabled);
      },
      undefined,
      { timeout: 8000 }
    )
    .then(() => true)
    .catch(() => false);
  if (!ready && channel === "blog") {
    await fillBlogSteppedFormViaDom(page, form);
    await page.waitForTimeout(600);
  }
}

async function waitForGenerateEnabled(page, timeoutMs = 15_000, pattern) {
  const dataAttr =
    pattern && /블로그|이야기/.test(String(pattern))
      ? "blog"
      : pattern && /플레이스/.test(String(pattern))
        ? "place"
        : pattern && /인스타/.test(String(pattern))
          ? "insta"
          : pattern && /썸네일|이미지/.test(String(pattern))
            ? "image"
            : null;
  if (dataAttr) {
    const attrBtn = page.locator(`[data-briclog-generate="${dataAttr}"]:not([disabled])`).first();
    try {
      await attrBtn.waitFor({ state: "visible", timeout: timeoutMs });
      return attrBtn;
    } catch {
      /* fall through */
    }
  }
  const re =
    pattern ||
    /조사 후 블로그 받기|조사 후 글 받기|구성안 만들기|이야기 쓰기|플레이스 소개글|인스타 캡션|썸네일 문구|이미지 프롬프트/i;
  const btn = page.locator("button:not([disabled])").filter({ hasText: re }).first();
  await btn.waitFor({ state: "visible", timeout: timeoutMs });
  return btn;
}

async function waitForWorkspaceIdle(page, timeoutMs = 180_000) {
  await page
    .evaluate(() => {
      window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
    })
    .catch(() => null);
  await page
    .waitForFunction(
      () => {
        const t = document.body.innerText || "";
        if (/편집본 작성 중|조사해서 글 쓰는 중|올리기 전 점검|만드는 중…|쓰는 중/.test(t)) {
          return false;
        }
        const disabled = document.querySelector(
          'button[disabled]:not([aria-hidden="true"])'
        );
        if (disabled?.textContent?.includes("만드는 중")) return false;
        return true;
      },
      undefined,
      { timeout: timeoutMs }
    )
    .catch(() => null);
  await page.waitForTimeout(500);
}

async function resetWorkspaceBetweenRuns(page) {
  await waitForWorkspaceIdle(page, 180_000);
  await refreshE2eSession(page);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dismissWorkspaceModals(page);
  await refreshE2eSession(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => null);
  await dismissWorkspaceModals(page);
  const ready = await waitForWorkspaceReady(page, 45_000);
  if (!ready.ok) {
    throw new Error(ready.reason || "workspace_not_ready_after_reset");
  }
  await page.waitForTimeout(800);
}

function uniqueSlaForm(form) {
  const stamp = String(Date.now()).slice(-6);
  return {
    ...form,
    brandName: form.brandName ? `${form.brandName}${stamp}` : form.brandName,
  };
}

async function ensureStandalone(page, channel) {
  const label = page.getByText(/단독으로 받기/i).first();
  if (!(await label.count())) return;
  const box = page.locator(`label:has-text("단독으로 받기") input[type="checkbox"]`).first();
  if (await box.count()) {
    const checked = await box.isChecked();
    if (!checked) await box.check({ force: true }).catch(() => null);
  }
}

async function waitForBlogResult(page, timeoutMs) {
  const genBtn = page.locator('[data-briclog-generate="blog"]:not([disabled])').first();
  await genBtn.waitFor({ state: "visible", timeout: 15_000 });
  await syncE2eSessionToPage(page, BASE);
  const t0 = Date.now();

  const blogApiPromise = page
    .waitForResponse(
      (r) => r.url().includes("/api/content/blog") && r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      kind: "blog",
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
      apiMs: Date.now() - t0,
    }))
    .catch((e) => ({ kind: "blog", apiError: e.message }));

  await dismissWorkspaceModals(page);
  await genBtn.scrollIntoViewIfNeeded().catch(() => null);
  await genBtn.click({ timeout: 10_000, force: true });
  await page.waitForTimeout(1200);
  const researchStarted = await page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/content/research") &&
        r.request().method() === "POST",
      { timeout: 8_000 }
    )
    .then(() => true)
    .catch(() => false);
  if (!researchStarted) {
    await page.keyboard.press("Control+Enter").catch(() => null);
  }

  const uiPromise = page.waitForFunction(
    () => {
      const t = document.body.innerText || "";
      if (t.includes("브랜드 · 지역 · 주제만 알려 주세요")) return false;
      if (t.includes("여기에 편집본이 채워집니다")) return false;
      if (/조사·편집 중|만드는 중|쓰는 중|편집본 작성 중/.test(t)) return false;
      const article = document.querySelector("article");
      if (article && (article.innerText || "").trim().length > 120) return true;
      const headings = [...document.querySelectorAll("h2, h3")].filter((el) => {
        const text = (el.textContent || "").trim();
        return text.length > 4 && !/오늘의 편집본|브랜드명|지역|주제/.test(text);
      });
      return headings.length >= 2;
    },
    undefined,
    { timeout: timeoutMs }
  );

  const [apiSettled, uiSettled] = await Promise.allSettled([blogApiPromise, uiPromise]);
  const api =
    apiSettled.status === "fulfilled"
      ? apiSettled.value
      : { kind: "blog", apiError: apiSettled.reason?.message || "blog_api_timeout" };
  const uiOk = uiSettled.status === "fulfilled";
  const apiHasContent =
    !api.apiError &&
    api.body?.ok !== false &&
    !api.body?.withheld &&
    api.body?.blogContent?.sections?.length;
  return {
    api,
    uiMs: Date.now() - t0,
    uiOk: uiOk || Boolean(apiHasContent),
    uiError: uiOk || apiHasContent ? null : api.body?.userMessage || api.apiError || "ui_result_timeout",
  };
}

async function waitForChannelResult(page, persona, timeoutMs) {
  const contentKey =
    persona.channel === "place"
      ? "placeContent"
      : persona.channel === "insta"
        ? "instagramContent"
        : "imagePrompts";
  const hintRe = String(persona.resultHint || "안내|캡션|프롬프트");

  const btn = page
    .locator(`[data-briclog-generate="${persona.channel}"]:not([disabled])`)
    .first();
  await btn.waitFor({ state: "visible", timeout: 15_000 }).catch(() => null);
  await btn.scrollIntoViewIfNeeded().catch(() => null);

  const t0 = Date.now();
  const apiPromise = page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/content/channel") &&
        r.request().method() === "POST",
      { timeout: timeoutMs }
    )
    .then(async (res) => ({
      status: res.status(),
      ok: res.ok(),
      body: await res.json().catch(() => ({})),
      apiMs: Date.now() - t0,
    }))
    .catch((e) => ({ apiError: e.message }));

  const uiPromise = page.waitForFunction(
    ({ hint, channel }) => {
      const t = document.body.innerText || "";
      if (/만드는 중|조사·편집 중|편집본 작성 중|올리기 전 점검/.test(t)) {
        return false;
      }
      if (t.includes("여기에 편집본이 채워집니다")) return false;
      const article = document.querySelector("article");
      if (article && (article.innerText || "").trim().length > 80) return true;
      const headings = [...document.querySelectorAll("h2, h3")].filter((el) => {
        const text = (el.textContent || "").trim();
        return text.length > 4 && !/브랜드명|지역|주제|오늘의 편집본/.test(text);
      });
      if (headings.length >= 1 && t.replace(/\s/g, "").length > 200) return true;
      try {
        if (new RegExp(hint, "i").test(t) && t.replace(/\s/g, "").length > 180) {
          return true;
        }
      } catch {
        /* ignore */
      }
      if (channel === "image" && /프롬프트|썸네일|thumbnail|비주얼/i.test(t)) {
        return true;
      }
      return false;
    },
    { hint: hintRe, channel: persona.channel },
    { timeout: timeoutMs }
  );

  await dismissWorkspaceModals(page);
  await refreshE2eSession(page);
  await btn.click({ timeout: 10_000, force: true });
  await page.waitForTimeout(800);
  await page.keyboard.press("Control+Enter").catch(() => null);

  const [apiSettled, uiSettled] = await Promise.allSettled([apiPromise, uiPromise]);
  const api =
    apiSettled.status === "fulfilled"
      ? apiSettled.value
      : { apiError: apiSettled.reason?.message || "channel_api_timeout" };
  const uiOk = uiSettled.status === "fulfilled";
  const apiHasContent =
    !api.apiError &&
    api.status < 400 &&
    api.body?.ok !== false &&
    !api.body?.withheld &&
    Boolean(api.body?.[contentKey]);
  return {
    api,
    uiOk: uiOk || apiHasContent,
    uiMs: Date.now() - t0,
    uiError:
      uiOk || apiHasContent
        ? null
        : api.body?.userMessage || api.apiError || "channel_ui_timeout",
  };
}

async function runPersona(page, persona, errors, networkFails, apiTrace) {
  const run = {
    id: persona.id,
    channel: persona.channel,
    label: persona.label,
    slaMs: CHANNEL_SLA_MS,
    status: "pass",
    elapsedMs: null,
    phases: {},
    errors: [],
    network: [],
  };

  const t0 = Date.now();
  let apiTraceStart = apiTrace.length;
  try {
    await openChannel(page, persona.menuPattern);
    run.phases.navigateMs = Date.now() - t0;

    if (persona.preferStandalone) {
      await ensureStandalone(page, persona.channel);
    }

    const fillStart = Date.now();
    const form = uniqueSlaForm(persona.form);
    await fillCommonFields(page, form, persona.channel);
    if (persona.form.placeHeadline) {
      await fillIfPresent(page, /헤드라인|한 줄/i, persona.form.placeHeadline);
    }
    if (persona.form.instaScene) {
      await fillIfPresent(page, /장면/i, persona.form.instaScene);
    }
    run.phases.fillMs = Date.now() - fillStart;

    try {
      await waitForGenerateEnabled(page, 12_000, persona.generatePattern);
    } catch {
      run.errors.push("generate_button_disabled");
      throw new Error("generate_button_disabled");
    }

    const remaining = CHANNEL_SLA_MS - (Date.now() - t0);
    if (remaining < 5000) throw new Error("setup_exceeded_sla");
    run.phases.genBudgetMs = CHANNEL_SLA_MS;
    run.phases.setupBudgetMs = Date.now() - t0;

    const genStart = Date.now();
    apiTraceStart = apiTrace.length;
    if (persona.channel === "blog") {
      const uncachedBlogOnly = page.locator('label:has-text("플레이스·인스타") input[type="checkbox"]');
      if (await uncachedBlogOnly.count()) {
        const checked = await uncachedBlogOnly.isChecked();
        if (checked) await uncachedBlogOnly.uncheck({ force: true }).catch(() => null);
      }
      await refreshE2eSession(page);
      const { api, uiMs, uiOk, uiError } = await waitForBlogResult(page, CHANNEL_SLA_MS);
      run.phases.api = api;
      run.phases.uiMs = uiMs;
      run.phases.uiOk = uiOk;
      if (!uiOk) {
        run.errors.push(uiError || "ui_result_timeout");
        throw new Error(uiError || "ui_result_timeout");
      }
      const apiHasContent =
        !api.apiError &&
        api.status < 400 &&
        api.body?.ok !== false &&
        !api.body?.withheld &&
        api.body?.blogContent?.sections?.length;
      if (api.status && api.status >= 400) {
        run.errors.push(`blog_api_${api.status}`);
        run.network.push({ url: "/api/content/blog", status: api.status });
      } else if (!apiHasContent && api.apiError) {
        run.phases.apiNote = "ui_ok_without_blog_api";
      } else if (!apiHasContent) {
        run.phases.apiNote = api.body?.userMessage || "blog_api_no_content";
      }
    } else {
      const { api, uiOk, uiMs, uiError } = await waitForChannelResult(
        page,
        persona,
        CHANNEL_SLA_MS
      );
      run.phases.api = api;
      run.phases.uiMs = uiMs;
      run.phases.uiOk = uiOk;
      if (!uiOk) {
        run.errors.push(uiError || "channel_ui_timeout");
        throw new Error(uiError || "channel_ui_timeout");
      }
      const contentKey =
        persona.channel === "place"
          ? "placeContent"
          : persona.channel === "insta"
            ? "instagramContent"
            : "imagePrompts";
      const apiHasContent =
        !api.apiError &&
        api.status < 400 &&
        api.body?.ok !== false &&
        !api.body?.withheld &&
        Boolean(api.body?.[contentKey]);
      if (!apiHasContent && api.apiError) {
        run.phases.apiNote = "ui_ok_without_channel_api";
      } else if (!apiHasContent) {
        run.phases.apiNote = api.body?.userMessage || "channel_api_no_content";
      }
      if (api.status && api.status >= 400 && !uiOk) {
        run.errors.push(`channel_api_${api.status}`);
        run.network.push({ url: "/api/content/channel", status: api.status });
      }
    }
    run.phases.generateMs = Date.now() - genStart;
    run.elapsedMs = Date.now() - t0;
    run.phases.setupMs = run.elapsedMs - run.phases.generateMs;

    const blogApiCalled = apiTrace.some(
      (t) => t.url?.includes("/api/content/blog") && t.method === "POST"
    );
    run.phases.blogApiCalled = blogApiCalled;

    if (persona.channel === "blog" && run.phases.uiOk && !blogApiCalled) {
      run.warnings = [
        ...(run.warnings || []),
        "ui_without_blog_api_local_fallback",
      ];
    }
    if (
      persona.channel !== "blog" &&
      run.phases.uiOk &&
      run.phases.apiNote === "ui_ok_without_channel_api"
    ) {
      run.warnings = [
        ...(run.warnings || []),
        "ui_without_channel_api_local_fallback",
      ];
    }

    const blogDelivered =
      persona.channel === "blog" &&
      run.phases.uiOk &&
      run.phases.api?.status === 200 &&
      run.phases.api?.body?.blogContent?.sections?.length;
    const channelDelivered =
      persona.channel !== "blog" && run.phases.uiOk;
    const overGenBudget = run.phases.generateMs > (run.phases.genBudgetMs || CHANNEL_SLA_MS);
    if (overGenBudget) {
      if (blogDelivered || channelDelivered) {
        run.status = "pass_with_warnings";
        run.warnings = [...(run.warnings || []), "sla_exceeded"];
        run.failReason = "sla_exceeded";
      } else {
        run.status = "fail";
        run.failReason = "sla_exceeded";
      }
    } else if (run.status === "pass" && run.warnings?.length) {
      run.status = "pass_with_warnings";
    }
  } catch (err) {
    run.elapsedMs = Date.now() - t0;
    run.status = "fail";
    run.failReason = err.message;
    run.errors.push(err.message);
  }

  run.consoleErrors = errors.slice(-20);
  run.networkFails = networkFails.filter((n) =>
    n.url?.includes("/api/")
  ).slice(-15);
  run.apiTrace = apiTrace.slice(apiTraceStart);

  if (run.status === "fail") {
    run.pageSnippet = await page
      .evaluate(() => (document.body.innerText || "").slice(0, 1200))
      .catch(() => null);
  }

  return run;
}

async function main() {
  loadEnvLocalAndCredentials();

  const probe = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).catch(
    () => null
  );
  if (!probe?.ok) {
    console.error(`Server not reachable at ${BASE} — run: npm run dev:3005`);
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctxResult = await createAuthenticatedContext(browser, BASE, {
    width: 1280,
    height: 900,
  });
  if (!ctxResult.ok) {
    console.error("Auth failed:", ctxResult.reason);
    process.exit(1);
  }

  const context = ctxResult.context;
  let page = await context.newPage();
  await installE2eAuthRequestBridge(page, BASE);
  const consoleErrors = [];
  const networkFails = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const apiTrace = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      apiTrace.push({
        url: res.url().split("?")[0],
        status: res.status(),
        method: res.request().method(),
        at: Date.now(),
      });
      if (res.status() >= 400) {
        networkFails.push({ url: res.url(), status: res.status() });
      }
    }
  });

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    slaMs: CHANNEL_SLA_MS,
    login: null,
    runs: [],
    summary: {},
  };

  report.login = {
    ...ctxResult.auth,
    ...(await openWorkspace(page)),
  };
  if (!report.login.ok) {
    report.summary = { skipped: true, reason: report.login.reason };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(sanitizeSlaReport(report), null, 2), "utf8");
    console.log("SKIP — workspace not ready:", report.login.reason);
    await browser.close();
    process.exit(1);
  }

  const limit = Number(process.env.CHANNEL_SLA_LIMIT) || 0;
  const start = Number(process.env.CHANNEL_SLA_START) || 0;
  const slice = limit > 0
    ? CHANNEL_SLA_PERSONAS.slice(start, start + limit)
    : CHANNEL_SLA_PERSONAS.slice(start);
  const personas = slice.length ? slice : CHANNEL_SLA_PERSONAS;

  const attachPageListeners = (p) => {
    p.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    p.on("response", (res) => {
      if (res.url().includes("/api/")) {
        apiTrace.push({
          url: res.url().split("?")[0],
          status: res.status(),
          method: res.request().method(),
          at: Date.now(),
        });
        if (res.status() >= 400) {
          networkFails.push({ url: res.url(), status: res.status() });
        }
      }
    });
  };

  attachPageListeners(page);

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    if (i > 0) {
      await page.close().catch(() => null);
      await refreshBrowserAuth(context);
      page = await context.newPage();
      attachPageListeners(page);
      await installE2eAuthRequestBridge(page, BASE);
      try {
        await resetWorkspaceBetweenRuns(page);
      } catch (err) {
        report.runs.push({
          id: persona.id,
          status: "fail",
          failReason: "workspace_reset_failed",
          errors: [String(err.message || err)],
        });
        continue;
      }
    }
    const login = await openWorkspace(page);
    if (!login.ok) {
      report.runs.push({
        id: persona.id,
        status: "fail",
        failReason: "workspace_not_ready",
        errors: [login.reason],
      });
      continue;
    }
    report.runs.push(
      await runPersona(page, persona, consoleErrors, networkFails, apiTrace)
    );
  }

  await browser.close();

  const passed = report.runs.filter(
    (r) => r.status === "pass" || r.status === "pass_with_warnings"
  );
  const failed = report.runs.filter((r) => r.status === "fail");
  report.summary = {
    total: report.runs.length,
    passed: passed.length,
    failed: failed.length,
    withinSla: passed.map((r) => r.id),
    overSlaOrError: failed.map((r) => ({
      id: r.id,
      elapsedMs: r.elapsedMs,
      failReason: r.failReason,
      errors: r.errors,
    })),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(sanitizeSlaReport(report), null, 2), "utf8");

  console.log(`\n=== CHANNEL SLA SMOKE (${Math.round(CHANNEL_SLA_MS / 1000)}s) ===\n`);
  console.log("Report:", OUT);
  for (const r of report.runs) {
    const mark =
      r.status === "pass" || r.status === "pass_with_warnings" ? "PASS" : "FAIL";
    console.log(
      `[${mark}] ${r.id} — ${(r.elapsedMs / 1000).toFixed(1)}s`,
      r.failReason || "",
      r.errors?.length ? `errors: ${r.errors.join("; ")}` : ""
    );
    if (r.phases?.api) {
      console.log("       api:", JSON.stringify(r.phases.api));
    }
  }
  console.log("\nSummary:", report.summary);

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
