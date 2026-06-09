/**
 * 신규 유입자 ~20명 — 가입·온보딩·채널별 글쓰기 여정 감사
 * Run: BASE_URL=https://briclog.ai node --import ./scripts/register-alias.mjs scripts/twenty-new-user-journey-audit.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { HUNDRED_USER_PERSONAS } from "../lib/qa/hundredUserPersonas.js";
import { CHANNEL_SLA_PERSONAS } from "../lib/qa/channelSlaPersonas.js";
import { TEN_USER_PERSONAS } from "../lib/qa/tenUserPersonas.js";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import {
  createAuthenticatedContext,
  dismissWorkspaceModals,
  fillBlogFormViaDom,
  fillChannelFormViaDom,
  installE2eAuthRequestBridge,
  waitForWorkspaceReady,
} from "./lib/e2eAuth.js";
import {
  ensureE2eTestUser,
  buildSupabasePlaywrightStorage,
  applySupabaseSessionToContext,
} from "./ensure-e2e-test-user.mjs";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  buildFormBlogProxy,
  buildBaseContentLabel,
  normalizePipelineInput,
} from "../lib/contentPipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "twenty-new-user-journey-report.json");
const CHANNEL_SLA_MS = Number(process.env.CHANNEL_SLA_MS) || 300_000;

/** UX만 검사할 16명 — 업종·여정 다양성 */
const UX_PERSONA_IDS = [
  "u001",
  "u002",
  "u003",
  "u004",
  "u013",
  "u014",
  "u023",
  "u024",
  "u006",
  "u016",
  "u026",
  "u036",
  "u007",
  "u017",
  "u008",
  "u018",
];

/** API 글쓰기 4명 — 업종 대표 */
const WRITER_PERSONA_IDS = ["p1_cafe", "p2_salon", "p4_flower", "p5_pension"];

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
  applyE2eTestCredentialsToEnv(process.env);
}

async function dismissIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return "absent";
  const skip = page.locator('[data-briclog-intro-skip="1"]');
  if (await skip.count()) await skip.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(400);
  return (await intro.count()) ? "still_open" : "dismissed";
}

async function dismissWelcome(page) {
  const btn = page.getByRole("button", { name: /건너뛰기|시작하기/i });
  if (await btn.count()) {
    await btn.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
}

function countBlockingOverlays(page) {
  return page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "absolute") continue;
      const r = el.getBoundingClientRect();
      if (
        r.width >= window.innerWidth * 0.85 &&
        r.height >= window.innerHeight * 0.85 &&
        s.pointerEvents !== "none" &&
        parseFloat(s.opacity) > 0.05
      ) {
        n += 1;
      }
    }
    return n;
  });
}

async function navigateMenu(page, menu, persona) {
  if (!menu) return true;
  const mobile = persona.device === "mobile" || persona.device === "tablet";
  const map = {
    blog: /이야기/,
    place: /플레이스/,
    insta: /인스타/,
  };
  const pattern = map[menu];
  if (!pattern) return true;

  if (mobile) {
    const labels = { blog: "이야기", place: "플레이스", insta: "인스타" };
    const bottom = page
      .locator('nav[aria-label="채널 바로가기"] button')
      .filter({ hasText: labels[menu] });
    if (await bottom.count()) {
      await bottom.first().click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(600);
      return true;
    }
  }

  const nav = page.locator('nav[aria-label="작업 메뉴"]').first();
  const btn = nav.getByRole("button", { name: pattern }).first();
  if (!(await btn.count())) return false;
  await btn.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(600);
  return true;
}

async function hasGenerateCta(page, channel = "blog") {
  const patterns = {
    blog: /조사 후 글 받기|구성안 만들기|이야기 쓰기/i,
    place: /플레이스 소개글/i,
    insta: /인스타 캡션|인스타 초안/i,
    image: /썸네일 문구/i,
  };
  const re = patterns[channel] || patterns.blog;
  return (
    (await page.locator("button.briclog-btn-primary").filter({ hasText: re }).count()) > 0 ||
    (await page.locator(`[data-briclog-generate="${channel}"]`).count()) > 0
  );
}

async function runUxPersona(page, persona, loggedIn) {
  const run = {
    id: persona.id,
    label: persona.label,
    journeyType: persona.journeyType,
    device: persona.device,
    phase: "onboarding_ux",
    status: "pass",
    steps: [],
  };

  if (persona.needsAuth && !loggedIn) {
    run.status = "skip";
    run.skipReason = "auth_required";
    return run;
  }

  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await dismissWorkspaceModals(page);

    if (!persona.needsAuth) {
      const intro = await dismissIntro(page);
      run.steps.push({ step: "intro_dismiss", ok: intro !== "still_open", detail: intro });
      const cta = page.locator('[data-briclog-cta="start"]').first();
      run.steps.push({ step: "start_cta", ok: (await cta.count()) > 0 });
      const blockers = await countBlockingOverlays(page);
      run.steps.push({ step: "no_blockers", ok: blockers <= 1, blockers });
    } else {
      await dismissIntro(page);
      await dismissWelcome(page);
      const ready = await waitForWorkspaceReady(page, 45_000);
      run.steps.push({ step: "workspace_ready", ok: ready.ok, detail: ready.reason });
      const navOk = await navigateMenu(page, persona.primaryMenu, persona);
      run.steps.push({ step: `nav_${persona.primaryMenu || "home"}`, ok: navOk });
      const genOk = await hasGenerateCta(page, persona.primaryMenu === "insta" ? "insta" : persona.primaryMenu === "place" ? "place" : "blog");
      run.steps.push({ step: "generate_cta_visible", ok: genOk });
      const blockers = await countBlockingOverlays(page);
      run.steps.push({ step: "no_blockers", ok: blockers <= 2, blockers });
    }

    if (run.steps.some((s) => s.ok === false)) run.status = "fail";
  } catch (err) {
    run.status = "fail";
    run.error = err.message;
  }
  return run;
}

async function generateResearchAsync(formValues) {
  const auth = await getE2eBearerToken();
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      researchQuery: `${formValues.brandName} ${formValues.topic || formValues.mainKeyword}`,
      researchTypes: ["web", "brand"],
      researchMode: "v2_axis",
      brandName: formValues.brandName,
      region: formValues.region,
      industry: formValues.industry,
      mainKeyword: formValues.mainKeyword || formValues.topic,
      topic: formValues.topic,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  return { research: data?.research || data, ...data };
}

async function fetchBlogApi(pipelineInput) {
  const auth = await getE2eBearerToken();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(slimBlogApiPayload(pipelineInput)),
    signal: AbortSignal.timeout(280_000),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: null };
}

async function runWriterPersona(persona) {
  const run = {
    id: persona.id,
    label: persona.label,
    phase: "channel_write_api",
    status: "pass",
    channels: {},
    totalMs: 0,
  };
  const t0 = Date.now();

  const input = normalizePipelineInput({
    ...persona.input,
    v4Speaker: persona.v4Speaker,
    blogLengthTier: "medium",
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
  });

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync,
      onStep: () => {},
    });
    if (!axis.ok) throw new Error(axis.userMessage || "research_failed");

    const tBlog = Date.now();
    const api = await fetchBlogApi(input);
    const blogMs = Date.now() - tBlog;
    const blogPack = api.body?.blogContent;
    run.channels.blog = {
      ok: api.status === 200 && blogPack?.sections?.length >= 2,
      status: api.status,
      mode: api.body?.mode,
      sections: blogPack?.sections?.length || 0,
      chars: blogPack ? countBlogBodyCharsWithSpaces(blogPack) : 0,
      withheld: api.body?.withheld,
      userMessage: api.body?.userMessage,
      ms: blogMs,
    };

    const blogProxy =
      blogPack?.sections?.length >= 2 ? blogPack : buildFormBlogProxy(input);
    const label = buildBaseContentLabel(input, blogProxy);

    const tPlace = Date.now();
    const place = runPlacePipeline(input, blogProxy, label);
    run.channels.place = {
      ok: Boolean(place?.title || place?.body),
      hasTitle: Boolean(place?.title),
      bodyChars: String(place?.body || "").replace(/\s/g, "").length,
      ms: Date.now() - tPlace,
    };

    const tInsta = Date.now();
    const insta = runInstagramPipeline(
      input,
      blogProxy,
      input.tone || "emotional",
      label
    );
    run.channels.insta = {
      ok: Boolean(insta?.caption || insta?.body),
      hashtagCount: (insta?.hashtags || []).length,
      ms: Date.now() - tInsta,
    };

    const tImage = Date.now();
    const image = runImagePipeline(input, blogProxy, label);
    run.channels.image = {
      ok: Boolean(image?.prompt || image?.prompts?.length),
      ms: Date.now() - tImage,
    };

    run.totalMs = Date.now() - t0;
    if (!run.channels.blog.ok) run.status = "fail";
    if (!run.channels.place.ok || !run.channels.insta.ok) {
      run.status = run.status === "fail" ? "fail" : "partial";
    }
  } catch (err) {
    run.status = "fail";
    run.error = err.message;
    run.totalMs = Date.now() - t0;
  }
  return run;
}

async function runChannelE2E(page, persona) {
  const run = {
    id: persona.id,
    label: persona.label,
    channel: persona.channel,
    phase: "channel_e2e_playwright",
    status: "running",
    elapsedMs: 0,
    failReason: null,
  };
  const t0 = Date.now();

  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await dismissWorkspaceModals(page);
    const ready = await waitForWorkspaceReady(page, 45_000);
    if (!ready.ok) throw new Error(ready.reason || "workspace_not_ready");

    await page.getByRole("button", { name: persona.menuPattern }).first().click({ timeout: 8000 });
    await page.waitForTimeout(600);

    if (persona.channel !== "blog") {
      const box = page.locator('label:has-text("단독으로 받기") input[type="checkbox"]').first();
      if (await box.count()) await box.check({ force: true }).catch(() => null);
    }

    if (persona.channel === "blog") {
      await fillBlogFormViaDom(page, persona.form);
    } else {
      await fillChannelFormViaDom(page, persona.channel, persona.form);
    }
    await page.waitForTimeout(500);

    const genPattern = persona.generatePattern;
    const btn = page.locator("button:not([disabled])").filter({ hasText: genPattern }).first();
    await btn.waitFor({ state: "visible", timeout: 20_000 });
    await dismissWorkspaceModals(page);
    await btn.click({ timeout: 10_000, force: true });

    await page.waitForFunction(
      () => {
        const t = document.body.innerText || "";
        if (/편집본 작성 중|조사해서 글 쓰는 중|만드는 중|쓰는 중/.test(t)) return false;
        if (t.includes("여기에 편집본이 채워집니다")) return false;
        const article = document.querySelector("article");
        if (article && (article.innerText || "").trim().length > 80) return true;
        return t.replace(/\s/g, "").length > 200;
      },
      undefined,
      { timeout: CHANNEL_SLA_MS }
    );

    run.status = Date.now() - t0 <= CHANNEL_SLA_MS ? "pass" : "pass_with_warnings";
    if (Date.now() - t0 > CHANNEL_SLA_MS) run.failReason = "over_sla";
  } catch (err) {
    run.status = "fail";
    run.failReason = err.message?.slice(0, 200);
  }
  run.elapsedMs = Date.now() - t0;
  return run;
}

function buildFeedback(report) {
  const items = [];
  const uxFails = report.uxRuns.filter((r) => r.status === "fail");
  const uxSkips = report.uxRuns.filter((r) => r.status === "skip");
  const writerFails = report.writerRuns.filter((r) => r.status === "fail");
  const e2eFails = report.e2eRuns.filter((r) => r.status === "fail");

  if (uxFails.length) {
    items.push({
      severity: "high",
      area: "온보딩·네비",
      message: `${uxFails.length}명 UX 실패 — 인트로·워크스페이스·생성 버튼`,
      personas: uxFails.map((r) => r.id),
    });
  }
  if (uxSkips.length) {
    items.push({
      severity: "medium",
      area: "가입",
      message: `${uxSkips.length}명 인증 스킵 — 테스트 계정 로그인 필요`,
    });
  }
  for (const w of report.writerRuns) {
    if (!w.channels?.blog?.ok) {
      items.push({
        severity: "critical",
        area: "이야기 생성",
        message: `${w.label}: 블로그 본문 없음 — ${w.channels?.blog?.userMessage || "empty"}`,
        persona: w.id,
      });
    }
    if (w.channels?.blog?.chars < 400 && w.channels?.blog?.ok) {
      items.push({
        severity: "medium",
        area: "이야기 품질",
        message: `${w.label}: 본문 짧음 (${w.channels.blog.chars}자)`,
        persona: w.id,
      });
    }
    if (!w.channels?.place?.ok) {
      items.push({
        severity: "high",
        area: "플레이스",
        message: `${w.label}: 플레이스 파생 실패`,
        persona: w.id,
      });
    }
    if (!w.channels?.insta?.ok) {
      items.push({
        severity: "high",
        area: "인스타",
        message: `${w.label}: 인스타 파생 실패`,
        persona: w.id,
      });
    }
  }
  for (const e of report.e2eRuns) {
    if (e.status === "fail") {
      items.push({
        severity: "critical",
        area: `E2E ${e.channel}`,
        message: `${e.label}: ${e.failReason || "timeout"}`,
        persona: e.id,
      });
    }
    if (e.elapsedMs > CHANNEL_SLA_MS) {
      items.push({
        severity: "medium",
        area: "대기 시간",
        message: `${e.label}: ${(e.elapsedMs / 1000).toFixed(0)}초 (목표 ${CHANNEL_SLA_MS / 1000}초)`,
        persona: e.id,
      });
    }
  }

  const passUx = report.uxRuns.filter((r) => r.status === "pass").length;
  const passWriter = report.writerRuns.filter((r) => r.status === "pass").length;
  const passE2e = report.e2eRuns.filter(
    (r) => r.status === "pass" || r.status === "pass_with_warnings"
  ).length;

  report.summary = {
    totalPersonas: 20,
    ux: { total: report.uxRuns.length, pass: passUx, fail: uxFails.length },
    writers: { total: report.writerRuns.length, pass: passWriter, fail: writerFails.length },
    e2eChannels: { total: report.e2eRuns.length, pass: passE2e, fail: e2eFails.length },
    feedback: items,
    verdict:
      writerFails.length === 0 && e2eFails.length === 0 && uxFails.length <= 2
        ? "pass_with_notes"
        : writerFails.length || e2eFails.length
          ? "needs_fix"
          : "partial",
  };
  return items;
}

async function main() {
  loadEnvLocal();
  process.env.BRICLOG_MISSION = process.env.BRICLOG_MISSION || "true";

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    slaMs: CHANNEL_SLA_MS,
    uxRuns: [],
    writerRuns: [],
    e2eRuns: [],
    auth: null,
    summary: null,
  };

  const uxPersonas = UX_PERSONA_IDS.map((id) =>
    HUNDRED_USER_PERSONAS.find((p) => p.id === id)
  ).filter(Boolean);

  const writerPersonas = WRITER_PERSONA_IDS.map((id) =>
    TEN_USER_PERSONAS.find((p) => p.id === id)
  ).filter(Boolean);

  console.log("=== 20 NEW USER JOURNEY AUDIT ===");
  console.log("base:", BASE);
  console.log("UX personas:", uxPersonas.length);
  console.log("Writer personas:", writerPersonas.length);
  console.log("E2E channels:", CHANNEL_SLA_PERSONAS.length);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  let loggedIn = false;

  const ensured = await ensureE2eTestUser();
  report.auth = { ok: ensured.ok, email: ensured.email, reused: ensured.reused };
  if (ensured.ok) {
    process.env.BRICLOG_TEST_EMAIL = ensured.email;
    process.env.BRICLOG_TEST_PASSWORD = ensured.password;
  }

  const session = await buildSupabasePlaywrightStorage(BASE);
  if (session.ok) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applySupabaseSessionToContext(ctx, session);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    loggedIn = await page.evaluate(() =>
      Boolean(
        document.querySelector(".briclog-workspace-header") ||
          document.querySelector('nav[aria-label="작업 메뉴"]')
      )
    );
    await ctx.close();
    report.auth.sessionOk = loggedIn;
  }

  console.log("\n--- Phase 1: UX onboarding (16) ---");
  for (const persona of uxPersonas) {
    const ctx = await browser.newContext({ viewport: persona.viewport });
    if (loggedIn && session.ok) await applySupabaseSessionToContext(ctx, session);
    const page = await ctx.newPage();
    const run = await runUxPersona(page, persona, loggedIn);
    report.uxRuns.push(run);
    console.log(`[${run.status.toUpperCase()}] ${run.id} ${run.label}`);
    await ctx.close();
  }

  await browser.close();

  console.log("\n--- Phase 2: Channel write API (4 industries) ---");
  for (const persona of writerPersonas) {
    process.stdout.write(`${persona.label}… `);
    const run = await runWriterPersona(persona);
    report.writerRuns.push(run);
    console.log(
      run.status,
      `blog:${run.channels?.blog?.sections || 0}sec`,
      `${((run.totalMs || 0) / 1000).toFixed(0)}s`
    );
  }

  console.log("\n--- Phase 3: E2E channel smoke (4 channels) ---");
  const browser2 = await chromium.launch({ headless: true });
  const ctxResult = await createAuthenticatedContext(browser2, BASE);
  if (!ctxResult.ok) {
    console.error("E2E auth failed:", ctxResult.reason);
    for (const p of CHANNEL_SLA_PERSONAS) {
      report.e2eRuns.push({
        id: p.id,
        label: p.label,
        channel: p.channel,
        phase: "channel_e2e_playwright",
        status: "skip",
        failReason: ctxResult.reason,
      });
    }
  } else {
    const page = await ctxResult.context.newPage();
    await installE2eAuthRequestBridge(page, BASE);
    for (let i = 0; i < CHANNEL_SLA_PERSONAS.length; i++) {
      const persona = CHANNEL_SLA_PERSONAS[i];
      if (i > 0) {
        await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await dismissWorkspaceModals(page);
        await page.waitForTimeout(1200);
      }
      const run = await runChannelE2E(page, persona);
      report.e2eRuns.push(run);
      console.log(
        `[${run.status.toUpperCase()}] ${run.id} ${(run.elapsedMs / 1000).toFixed(1)}s`,
        run.failReason || ""
      );
    }
    await ctxResult.context.close();
  }
  await browser2.close();

  buildFeedback(report);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("\nReport:", OUT);

  const fail =
    report.summary.verdict === "needs_fix" ||
    report.writerRuns.some((r) => r.status === "fail") ||
    report.e2eRuns.some((r) => r.status === "fail");
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
