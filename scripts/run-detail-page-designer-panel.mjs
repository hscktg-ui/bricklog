/**
 * 골라보다 결과물 — 디자이너 30인 평가 + 860px 스크린샷
 * Run: npm run run:detail-page-designer-panel
 */
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { generateDetailPagePack } from "../lib/product/detailPageEngine.js";
import {
  renderDetailPageBodyHtml,
  wrapSmartstoreHtml,
} from "../lib/product/detailPageHtml.js";
import { evaluateDetailPageDesignerPanel } from "../lib/qa/detailPageDesignerPanel30.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT_DIR = join(root, "artifacts", "detail-page-designer-panel");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
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
    /* optional */
  }
}

function photoData(w, h, bg, fg, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="48%" fill="${fg}" font-size="28" font-family="Pretendard, sans-serif" text-anchor="middle">${label}</text>
    <text x="50%" y="58%" fill="${fg}" font-size="14" opacity="0.7" font-family="Pretendard, sans-serif" text-anchor="middle">시안용 자리 · 실제 상품 사진 아님</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SAMPLE_PHOTOS = {
  "open-rice": [
    { src: photoData(860, 680, "#c4b49a", "#3f3428", "포대"), caption: "포대 사진" },
    { src: photoData(860, 440, "#d7cbb8", "#3f3428", "도정"), caption: "도정" },
    { src: photoData(860, 440, "#b9a48a", "#3f3428", "진공"), caption: "진공 포장" },
  ],
  "open-beans": [
    { src: photoData(860, 680, "#4a3428", "#f4ece4", "원두"), caption: "원두" },
    { src: photoData(860, 440, "#6b4a38", "#f4ece4", "로스팅"), caption: "로스팅" },
    { src: photoData(860, 440, "#3a281f", "#f4ece4", "분쇄"), caption: "분쇄 안내" },
  ],
};

async function screenshotHtml(html, paths) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 920, height: 1400 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.getElementById("gollaboda-detail-page"));
  await new Promise((r) => setTimeout(r, 800));
  const article = page.locator("#gollaboda-detail-page");
  await article.waitFor({ state: "visible", timeout: 8000 });
  await article.screenshot({ path: paths.full, type: "png" });
  const box = await article.boundingBox();
  if (box) {
    await page.screenshot({
      path: paths.hero,
      type: "png",
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(860, box.width),
        height: Math.min(980, box.height),
      },
    });
    const midY = Math.min(box.y + 1100, box.y + Math.max(0, box.height - 980));
    await page.screenshot({
      path: paths.mid,
      type: "png",
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, midY),
        width: Math.min(860, box.width),
        height: Math.min(980, box.height),
      },
    });
  }
  await browser.close();
}

async function runSample(example) {
  const photos = SAMPLE_PHOTOS[example.id] || [];
  const input = {
    ...example,
    highlights:
      example.id === "open-rice"
        ? "여주에서 당일 도정\n진공 포장 그대로 집까지"
        : "주문 후 분쇄 가능\n당일 로스팅 안내",
    mustInclude:
      example.id === "open-rice"
        ? "도정 시각은 방문 당일만 안내합니다."
        : "분쇄 굵기는 주문 시 고릅니다.",
    imageCount: photos.length,
    photoCaptions: photos.map((p) => p.caption),
  };
  const t0 = Date.now();
  const gen = await generateDetailPagePack(input);
  const ms = Date.now() - t0;
  const pack = gen.pack;
  const body = renderDetailPageBodyHtml(pack, photos);
  const html = wrapSmartstoreHtml(body, pack);
  const evaled = evaluateDetailPageDesignerPanel({
    pack,
    html: body,
    photoCount: photos.length,
  });
  const slug = example.id.replace(/^open-/, "");
  writeFileSync(join(OUT_DIR, `${slug}.html`), html, "utf8");
  await screenshotHtml(html, {
    full: join(OUT_DIR, `${slug}-full.png`),
    hero: join(OUT_DIR, `${slug}-hero.png`),
    mid: join(OUT_DIR, `${slug}-mid.png`),
  });
  return {
    id: example.id,
    label: example.label,
    productName: pack.productName,
    headline: pack.headline,
    mode: gen.mode,
    ms,
    engineScore: pack._meta?.sqv?.score ?? null,
    chars: pack._meta?.chars ?? null,
    standardOk: pack._meta?.standard?.ok ?? null,
    photos: photos.length,
    images: [`${slug}-hero.png`, `${slug}-mid.png`, `${slug}-full.png`],
    panel: evaled.summary,
    measured: evaled.measured,
    votes: evaled.votes,
  };
}

loadEnvLocal();
mkdirSync(OUT_DIR, { recursive: true });

const samples = [];
for (const example of DETAIL_PAGE_OPEN_EXAMPLES) {
  samples.push(await runSample(example));
}

const means = samples.map((s) => s.panel.mean);
const report = {
  version: "gollaboda-designer-30-v1",
  generatedAt: new Date().toISOString(),
  nDesigners: 30,
  samples,
  overall: {
    mean: Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10,
    hire: samples.every((s) => s.panel.hire),
    issues: [...new Set(samples.flatMap((s) => s.panel.topIssues))],
  },
};
writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2));
writeFileSync(join(OUT_DIR, "latest-summary.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  overall: report.overall,
  samples: samples.map((s) => ({
    id: s.id,
    productName: s.productName,
    mode: s.mode,
    ms: s.ms,
    engineScore: s.engineScore,
    panelMean: s.panel.mean,
    passCount: s.panel.passCount,
    hireLabel: s.panel.hireLabel,
    topIssues: s.panel.topIssues,
    images: s.images,
  })),
}, null, 2));
console.log(JSON.stringify(report.overall, null, 2));
console.log(samples.map((s) => ({
  id: s.id,
  mode: s.mode,
  mean: s.panel.mean,
  pass: `${s.panel.passCount}/30`,
  hire: s.panel.hireLabel,
  issues: s.panel.topIssues,
})).map((row) => JSON.stringify(row)).join("\n"));
