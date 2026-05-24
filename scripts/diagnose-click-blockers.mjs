/**
 * 클릭 차단 원인 증명용 진단 (코드 수정 없음)
 * Run: node scripts/diagnose-click-blockers.mjs
 * Optional: BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD in .env.local
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3005";
const OUT = join(root, "config", "click-blocker-report.json");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env.local */
  }
}

/** 브라우저 콘솔과 동일한 진단 (페이지 컨텍스트) */
function diagnoseInPage() {
  const points = [
    { name: "center", x: Math.floor(window.innerWidth / 2), y: Math.floor(window.innerHeight / 2) },
    { name: "sidebar", x: 120, y: 300 },
    { name: "main", x: Math.floor(window.innerWidth * 0.55), y: 300 },
    { name: "header", x: Math.floor(window.innerWidth * 0.5), y: 40 },
  ];

  function describe(el) {
    if (!el || el.nodeType !== 1) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      id: el.id || null,
      className: String(el.className || "").slice(0, 220),
      position: s.position,
      zIndex: s.zIndex,
      pointerEvents: s.pointerEvents,
      opacity: s.opacity,
      display: s.display,
      visibility: s.visibility,
      rect: {
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
      },
    };
  }

  const samplePoints = {};
  for (const p of points) {
    const top = document.elementFromPoint(p.x, p.y);
    samplePoints[p.name] = {
      coords: p,
      top: describe(top),
      path: document.elementsFromPoint(p.x, p.y).slice(0, 12).map(describe),
    };
  }

  const overlayKeywords =
    /overlay|backdrop|loading|modal|intro|welcome|fixed inset|z-\[|pointer-events/i;
  const overlays = [];

  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") continue;
    const op = parseFloat(s.opacity);
    if (Number.isFinite(op) && op < 0.05) continue;

    const r = el.getBoundingClientRect();
    const covers =
      r.width >= window.innerWidth * 0.85 &&
      r.height >= window.innerHeight * 0.85;
    const fixedLike = s.position === "fixed" || s.position === "absolute";
    const cls = String(el.className || "");
    const zNum = parseInt(s.zIndex, 10);
    const highZ = Number.isFinite(zNum) && zNum >= 50;
    const keyword = overlayKeywords.test(cls) || el.getAttribute("role") === "dialog";

    if (!covers && !(fixedLike && r.width > 300 && r.height > 300 && (highZ || keyword))) {
      continue;
    }

    const blocksClicks = s.pointerEvents !== "none";
    overlays.push({
      ...describe(el),
      coversViewport: covers,
      blocksClicks,
      role: el.getAttribute("role"),
      ariaHidden: el.getAttribute("aria-hidden"),
    });
  }

  overlays.sort((a, b) => {
    const za = parseInt(a.zIndex, 10) || 0;
    const zb = parseInt(b.zIndex, 10) || 0;
    return zb - za;
  });

  return {
    url: location.href,
    title: document.title,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
    htmlPointerEvents: getComputedStyle(document.documentElement).pointerEvents,
    hasDashboardMarker: !!document.querySelector("[data-workspace-preview]"),
    hasLandingMain: !!document.getElementById("landing-main"),
    hasIntroDialog: !!document.querySelector('[aria-label="BRICLOG 소개"]'),
    loadingText: Array.from(document.querySelectorAll("body *"))
      .map((n) => (n.childNodes.length === 1 && n.textContent ? n.textContent.trim() : ""))
      .filter((t) => /준비|확인|불러오는/.test(t))
      .slice(0, 5),
    samplePoints,
    centerElement: describe(
      document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    ),
    overlayCandidates: overlays,
    blockingOverlays: overlays.filter(
      (o) =>
        o.blocksClicks &&
        o.coversViewport &&
        (o.position === "fixed" || o.position === "sticky") &&
        !["HTML", "BODY"].includes(o.tag)
    ),
  };
}

async function dismissLandingIntro(page) {
  const intro = page.locator('[aria-label="BRICLOG 소개"]');
  if (!(await intro.count())) return "no_intro";
  await page.waitForTimeout(1500);
  await intro.click({ timeout: 3000 }).catch(() => null);
  await page.keyboard.press("Enter").catch(() => null);
  await page.waitForTimeout(2500);
  const still = await page.locator('[aria-label="BRICLOG 소개"]').count();
  return still ? "still_open" : "dismissed";
}

async function main() {
  loadEnvLocal();
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "playwright 미설치. 실행: npm install -D playwright && npx playwright install chromium"
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    const mq = window.matchMedia;
    window.matchMedia = (q) => {
      if (String(q).includes("prefers-reduced-motion")) {
        return { matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} };
      }
      return mq.call(window, q);
    };
  });
  const page = await context.newPage();

  const report = { base: BASE, phases: {} };

  await page.goto(BASE, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(1500);
  report.phases.pre_login_intro_open = await page.evaluate(diagnoseInPage);
  report.introDismiss = await dismissLandingIntro(page);
  await page.waitForTimeout(1000);
  report.phases.pre_login_after_intro = await page.evaluate(diagnoseInPage);

  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;
  if (email && password) {
    try {
      await page.getByRole("button", { name: /로그인/i }).first().click({ timeout: 5000 });
      await page.waitForTimeout(500);
      await page.getByLabel(/이메일|email/i).fill(email);
      await page.getByLabel(/비밀번호|password/i).fill(password);
      await page.getByRole("button", { name: /로그인/i }).last().click();
      await page.waitForTimeout(6000);
      report.phases.post_login = await page.evaluate(diagnoseInPage);
      report.loginAttempt = "submitted";
    } catch (err) {
      report.loginAttempt = `failed: ${err.message}`;
    }
  } else {
    report.loginAttempt =
      "skipped — set BRICLOG_TEST_EMAIL and BRICLOG_TEST_PASSWORD in .env.local for post-login phase";
  }

  report.diff = null;
  if (report.phases.pre_login && report.phases.post_login) {
    const pre = new Set(
      report.phases.pre_login.overlayCandidates.map(
        (o) => `${o.tag}|${o.className?.slice(0, 80)}`
      )
    );
    const postOnly = report.phases.post_login.overlayCandidates.filter(
      (o) => !pre.has(`${o.tag}|${o.className?.slice(0, 80)}`)
    );
    report.diff = {
      postLoginOnlyOverlays: postOnly,
      postLoginBlocking: report.phases.post_login.blockingOverlays,
      preLoginBlocking: report.phases.pre_login.blockingOverlays,
    };
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("=== CLICK BLOCKER DIAGNOSIS ===\n");
  console.log("Report:", OUT);
  console.log("\n[PRE-LOGIN intro OPEN] blocking layers:", report.phases.pre_login_intro_open?.blockingOverlays?.length ?? 0);
  for (const b of report.phases.pre_login_intro_open?.blockingOverlays || []) {
    console.log(" -", b.tag, b.className?.slice(0, 100), "z:", b.zIndex);
  }
  console.log("intro dismiss:", report.introDismiss);
  console.log("\n[PRE-LOGIN after intro] blocking layers:", report.phases.pre_login_after_intro?.blockingOverlays?.length ?? 0);
  for (const b of report.phases.pre_login_after_intro?.blockingOverlays || []) {
    console.log(" -", b.tag, b.className?.slice(0, 100), "z:", b.zIndex);
  }
  console.log("\n[PRE-LOGIN after intro] center top:", JSON.stringify(report.phases.pre_login_after_intro?.centerElement, null, 2));

  if (report.phases.post_login) {
    console.log("\n[POST-LOGIN] blocking full-screen layers:", report.phases.post_login.blockingOverlays?.length ?? 0);
    for (const b of report.phases.post_login.blockingOverlays || []) {
      console.log(" -", b.tag, b.className?.slice(0, 100), "z:", b.zIndex, "pe:", b.pointerEvents);
    }
    console.log("\n[POST-LOGIN] sidebar top:", JSON.stringify(report.phases.post_login?.samplePoints?.sidebar?.top, null, 2));
    console.log("\n[POST-LOGIN] main top:", JSON.stringify(report.phases.post_login?.samplePoints?.main?.top, null, 2));
  } else {
    console.log("\n", report.loginAttempt);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
