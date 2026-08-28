/**
 * 브릭로그 상세 — 디자이너 30인 패널.
 * 라이브 맛보기 + GPT 랭킹 리듬 결과를 실제 상품 컷으로 평가한다.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { generateDetailPagePack } from "../lib/product/detailPageEngine.js";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import {
  renderDetailPageBodyHtml,
  wrapMallHtml,
} from "../lib/product/detailPageHtml.js";
import { screenshotDetailPageHtml } from "./lib/screenshotDetailPage.mjs";
import { evaluateDetailPageDesignerPanel } from "../lib/qa/detailPageDesignerPanel30.js";
import { assessDetailPageSuccess } from "../lib/product/detailPageSuccessStandard.js";
import { DETAIL_PAGE_CORE_SHOTS } from "../lib/product/detailPageShotGen.js";
import { reviewDetailPageDesignerImage } from "../lib/qa/detailPageDesignerVision.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT_DIR = join(root, "artifacts", "detail-page-designer-panel");
const SAMPLE_DIR = join(root, "public", "detail-sample");

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

function shotFile(id, slot) {
  return join(SAMPLE_DIR, `${id}-${slot}.png`);
}

function loadShots(id) {
  return DETAIL_PAGE_CORE_SHOTS.map((slot) => {
    const file = shotFile(id, slot);
    if (!existsSync(file)) return null;
    const b64 = readFileSync(file).toString("base64");
    return {
      src: `data:image/png;base64,${b64}`,
      caption:
        slot === "hero"
          ? "포장 앞면"
          : slot === "observe"
            ? "손에 쥐거나 가까이"
            : "디테일 한 점",
      slot,
      generated: true,
    };
  }).filter(Boolean);
}

async function screenshotHtml(html, paths) {
  return screenshotDetailPageHtml(html, paths);
}

function panelRow({ id, label, pack, html, photos, mode, ms, screenshots, vision }) {
  const evaled = evaluateDetailPageDesignerPanel({
    pack,
    html,
    photoCount: photos.length,
    screenshots,
  });
  const success = assessDetailPageSuccess({
    pack,
    html,
    photoCount: photos.length,
    screenshots,
    requirePageImage: true,
    designerVision: vision,
  });
  return {
    id,
    label,
    productName: pack.productName,
    headline: pack.headline,
    mode,
    ms,
    engineScore: pack._meta?.sqv?.score ?? null,
    successScore: success.score,
    successOk: success.ok,
    standardOk: pack._meta?.standard?.ok ?? success.standardOk,
    photos: photos.length,
    imgCount: (html.match(/<img /g) || []).length,
    panel: evaled.summary,
    measured: {
      photo: evaled.measured.photo,
      uniqueness: evaled.measured.uniqueness,
      padHits: evaled.measured.padHits,
      intent: evaled.measured.intent,
      visualLayouts: evaled.measured.visualLayouts,
    },
    lowest: evaled.summary.lowest,
    highest: evaled.summary.highest,
    vision,
    lookedAtImage: evaled.measured.lookedAtImage,
  };
}

async function judgeRendered(example, { id, label, pack, html, documentHtml, photos, mode, t0 }) {
  const slug = id.replace(/^open-/, "").replace(/-live$/, "-live").replace(/-gpt$/, "-gpt");
  const paths = {
    full: join(OUT_DIR, `${slug}-full.png`),
    hero: join(OUT_DIR, `${slug}-hero.png`),
    mid: join(OUT_DIR, `${slug}-mid.png`),
  };
  writeFileSync(join(OUT_DIR, `${slug}.html`), documentHtml, "utf8");
  await screenshotHtml(documentHtml, paths);
  const screenshots = {
    hero: readFileSync(paths.hero),
    mid: readFileSync(paths.mid),
    full: readFileSync(paths.full),
  };
  const vision = await reviewDetailPageDesignerImage({
    screenshots,
    productName: pack.productName,
    brandName: pack.brandName,
  });
  const row = panelRow({
    id,
    label,
    pack,
    html,
    photos,
    mode,
    ms: Date.now() - t0,
    screenshots,
    vision,
  });
  row.images = [`${slug}-hero.png`, `${slug}-mid.png`, `${slug}-full.png`];
  return row;
}

async function runLiveSample(example) {
  const t0 = Date.now();
  const sample = buildDetailPagePublicSample(example.id);
  const photos = loadShots(example.id);
  const html = renderDetailPageBodyHtml(sample.pack, photos);
  const documentHtml = wrapMallHtml(html, sample.pack, "smartstore");
  return judgeRendered(example, {
    id: `${example.id}-live`,
    label: `${example.label} 맛보기`,
    pack: sample.pack,
    html,
    documentHtml,
    photos,
    mode: "live",
    t0,
  });
}

async function runGptSample(example) {
  const photos = loadShots(example.id);
  const t0 = Date.now();
  const gen = await generateDetailPagePack(
    { ...example, photos },
    { allowLlm: true, allowImages: false, logLlmError: true }
  );
  const html = renderDetailPageBodyHtml(gen.pack, photos);
  const documentHtml = wrapMallHtml(html, gen.pack, "smartstore");
  return judgeRendered(example, {
    id: `${example.id}-gpt`,
    label: `${example.label} GPT`,
    pack: gen.pack,
    html,
    documentHtml,
    photos,
    mode: gen.mode,
    t0,
  });
}

loadEnvLocal();
mkdirSync(OUT_DIR, { recursive: true });

const samples = [];
for (const example of DETAIL_PAGE_OPEN_EXAMPLES) {
  samples.push(await runLiveSample(example));
}
for (const example of DETAIL_PAGE_OPEN_EXAMPLES) {
  samples.push(await runGptSample(example));
}

const means = samples.map((s) => s.panel.mean);
const live = samples.filter((s) => s.mode === "live");
const gpt = samples.filter((s) => s.mode !== "live");
const report = {
  version: "gollaboda-designer-30-v3",
  generatedAt: new Date().toISOString(),
  nDesigners: 30,
  samples,
  overall: {
    mean: Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10,
    liveMean:
      Math.round(
        (live.reduce((a, s) => a + s.panel.mean, 0) / Math.max(1, live.length)) * 10
      ) / 10,
    gptMean:
      Math.round(
        (gpt.reduce((a, s) => a + s.panel.mean, 0) / Math.max(1, gpt.length)) * 10
      ) / 10,
    hire: live.every((s) => s.panel.hire && s.vision?.looked && s.vision.ok),
    liveHire: live.every((s) => s.panel.hire && s.vision?.looked && s.vision.ok),
    gptHire: gpt.every((s) => s.panel.hire && s.vision?.looked && s.vision.ok),
    visionLooked: samples.filter((s) => s.vision?.looked).length,
    issues: [...new Set(samples.flatMap((s) => [...s.panel.topIssues, ...(s.vision?.issues || [])]))],
  },
};
writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(OUT_DIR, "latest-summary.json"),
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      overall: report.overall,
      samples: samples.map((s) => ({
        id: s.id,
        label: s.label,
        mode: s.mode,
        ms: s.ms,
        engineScore: s.engineScore,
        successScore: s.successScore,
        successOk: s.successOk,
        panelMean: s.panel.mean,
        passCount: s.panel.passCount,
        hireLabel: s.panel.hireLabel,
        lookedAtImage: s.lookedAtImage,
        visionLooked: s.vision?.looked || false,
        visionScore: s.vision?.score ?? null,
        visionOk: s.vision?.ok ?? null,
        visionNote: s.vision?.note || "",
        topIssues: s.panel.topIssues,
        imgCount: s.imgCount,
        images: s.images,
        lowest: s.lowest.map((v) => `${v.name} ${v.score}`),
        highest: s.highest.map((v) => `${v.name} ${v.score}`),
      })),
    },
    null,
    2
  )
);
console.log(JSON.stringify(report.overall, null, 2));
for (const s of samples) {
  console.log(
    JSON.stringify({
      id: s.id,
      mode: s.mode,
      mean: s.panel.mean,
      pass: `${s.panel.passCount}/30`,
      hire: s.panel.hireLabel,
      looked: s.lookedAtImage,
      vision: s.vision?.looked ? s.vision.score : s.vision?.skip,
      success: s.successScore,
      successOk: s.successOk,
      issues: s.panel.topIssues,
    })
  );
}
process.exitCode = report.overall.liveHire ? 0 : 1;
