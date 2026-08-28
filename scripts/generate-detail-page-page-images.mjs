/**
 * 860 상세 HTML을 페이지 이미지로 찍는다. 상세 디자이너가 이 PNG를 본다.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { renderDetailPageBodyHtml, wrapMallHtml } from "../lib/product/detailPageHtml.js";
import { DETAIL_PAGE_CORE_SHOTS } from "../lib/product/detailPageShotGen.js";
import { screenshotDetailPageHtml } from "./lib/screenshotDetailPage.mjs";
import { inspectDetailPageScreenshots } from "../lib/qa/detailPagePageImage.js";
import { reviewDetailPageDesignerImage, DETAIL_PAGE_DESIGNER_VISION_MIN } from "../lib/qa/detailPageDesignerVision.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SAMPLE_DIR = join(root, "public", "detail-sample");
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

loadEnvLocal();
mkdirSync(SAMPLE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

function loadShots(id) {
  const hero = join(SAMPLE_DIR, `${id}-hero.png`);
  if (existsSync(hero)) {
    for (const slot of ["observe", "feature"]) {
      copyFileSync(hero, join(SAMPLE_DIR, `${id}-${slot}.png`));
    }
  }
  return DETAIL_PAGE_CORE_SHOTS.map((slot) => {
    const file = join(SAMPLE_DIR, `${id}-${slot}.png`);
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

const visions = [];
for (const example of DETAIL_PAGE_OPEN_EXAMPLES) {
  const sample = buildDetailPagePublicSample(example.id);
  const photos = loadShots(example.id);
  const html = renderDetailPageBodyHtml(sample.pack, photos);
  const documentHtml = wrapMallHtml(html, sample.pack, "smartstore");
  const slug = example.id;
  for (const file of readdirSync(SAMPLE_DIR)) {
    if (file.startsWith(`${slug}-img-`) && file.endsWith(".png")) {
      unlinkSync(join(SAMPLE_DIR, file));
    }
  }
  const paths = {
    full: join(SAMPLE_DIR, `${slug}-page-full.png`),
    hero: join(SAMPLE_DIR, `${slug}-page-hero.png`),
    mid: join(SAMPLE_DIR, `${slug}-page-mid.png`),
    stackPrefix: join(SAMPLE_DIR, `${slug}-img`),
  };
  const shot = await screenshotDetailPageHtml(documentHtml, paths);
  const stackFiles = (shot.stack || []).map((dest) => dest.split(/[/\\]/).pop());
  writeFileSync(
    join(SAMPLE_DIR, `${slug}-stack.json`),
    JSON.stringify(
      {
        id: slug,
        deliverable: "image-stack",
        images: stackFiles,
      },
      null,
      2
    )
  );
  const screenshots = {
    hero: readFileSync(paths.hero),
    mid: readFileSync(paths.mid),
    full: readFileSync(paths.full),
  };
  const inspected = inspectDetailPageScreenshots(screenshots);
  const vision = await reviewDetailPageDesignerImage({
    screenshots,
    productName: sample.productName,
    brandName: sample.brandName,
  });
  visions.push({
    id: example.id,
    inspected,
    vision: {
      looked: vision.looked,
      ok: vision.ok,
      score: vision.score,
      skip: vision.skip,
      issues: vision.issues,
      note: vision.note,
      designer: vision.designer?.name,
    },
  });
  console.log(
    JSON.stringify({
      id: example.id,
      png: inspected,
      stack: stackFiles.length,
      vision: visions[visions.length - 1].vision,
    })
  );
}

writeFileSync(
  join(OUT_DIR, "vision-latest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), samples: visions }, null, 2)
);

const failed = visions.filter(
  (v) =>
    !v.inspected.ok ||
    (v.vision.looked && (!v.vision.ok || v.vision.score < DETAIL_PAGE_DESIGNER_VISION_MIN))
);
process.exitCode = failed.length ? 1 : 0;
