/**
 * 랜딩·트렌드 화면 한국어 UI 감사 — 영문 시스템 라벨·타이포 기본값 검출 + 시안 캡처
 * Run: node scripts/audit-landing-korean-ui.mjs  (BASE_URL로 대상 변경)
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT_DIR = join(root, "artifacts", "landing-korean-ui");

/** 고객 화면에 나오면 안 되는 영문 시스템 라벨 */
const BANNED_TEXT = [
  "DATA DELAYED",
  "UPDATED ",
  "Last updated",
  "MIN AGO",
  "RISING",
  "STABLE",
  "FALLING",
  "MODELS",
  "TOOLS",
  "RESEARCH",
  "CODING",
  "AGENTS",
  "LAST UPDATED",
  "RANK MOVE",
  "Why It Matters",
  "What Is It",
  "Why Now",
  "Trend Score",
];

async function collect(page) {
  return page.evaluate(() => {
    const visibleText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const el = node.parentElement;
        if (!el) continue;
        if (el.closest(".sr-only,[hidden],script,style,head")) continue;
        const text = node.textContent.trim();
        if (text) out.push(text);
      }
      return out;
    };

    const headings = Array.from(document.querySelectorAll("h1,h2")).map((el) => {
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 60),
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        fontSizePx: Math.round(parseFloat(cs.fontSize)),
      };
    });

    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;

    return { texts: visibleText(document.body), headings, overflowX };
  });
}

function auditTexts(texts) {
  const joined = texts.join("\n");
  const hits = BANNED_TEXT.filter((needle) => joined.includes(needle));
  const repeated = {};
  for (const t of texts) repeated[t] = (repeated[t] || 0) + 1;
  const noisyRepeats = Object.entries(repeated)
    .filter(([text, n]) => n >= 5 && text.length > 3)
    .map(([text, n]) => ({ text: text.slice(0, 40), count: n }));
  const missingSpace = texts.filter((t) => /[가-힣],[가-힣]/.test(t));
  return { bannedHits: hits, noisyRepeats, missingSpace };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright required");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { at: new Date().toISOString(), base: BASE, pages: [] };
  let failed = 0;

  const targets = [
    { name: "landing", path: "/" },
    { name: "trend-detail", path: "/trend/chatgpt" },
  ];
  const viewports = [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ];

  for (const target of targets) {
    for (const vp of viewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      await page.goto(`${BASE}${target.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(1500);

      const data = await collect(page);
      const audit = auditTexts(data.texts);
      const shot = join(OUT_DIR, `${target.name}-${vp.label}.png`);
      await page.screenshot({ path: shot, fullPage: vp.label === "desktop" });

      const issues = [];
      if (audit.bannedHits.length) issues.push(`en_labels:${audit.bannedHits.join("|")}`);
      if (audit.missingSpace.length) issues.push(`missing_space:${audit.missingSpace[0]}`);
      if (data.overflowX) issues.push("horizontal_overflow");
      if (issues.length) failed += 1;

      report.pages.push({
        page: target.name,
        viewport: vp.label,
        issues,
        noisyRepeats: audit.noisyRepeats,
        headings: data.headings,
        screenshot: shot,
      });
      await page.close();
    }
  }

  await browser.close();
  writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2));

  for (const p of report.pages) {
    const mark = p.issues.length ? "FAIL" : "OK  ";
    console.log(`${mark} ${p.page}/${p.viewport} ${p.issues.join(" ") || ""}`);
    for (const r of p.noisyRepeats) console.log(`      반복 ${r.count}회: ${r.text}`);
  }
  console.log(`Report: ${join(OUT_DIR, "latest.json")}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
