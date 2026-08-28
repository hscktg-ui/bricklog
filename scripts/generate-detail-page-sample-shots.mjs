/**
 * 가입 전 맛보기용 컷 사진 6장. 가짜 모델컷 없이 상품만.
 */
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDetailPageShots } from "../lib/product/detailPageShotGen.js";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { getImageProviderStatus } from "../lib/imageGeneration/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env.local */
}

const outDir = join(root, "public", "detail-sample");
mkdirSync(outDir, { recursive: true });

function toBuffer(src) {
  if (String(src).startsWith("data:")) {
    const b64 = String(src).split(",")[1] || "";
    return Buffer.from(b64, "base64");
  }
  return null;
}

async function writeSrc(filePath, src) {
  const buf = toBuffer(src);
  if (buf) {
    writeFileSync(filePath, buf);
    return buf.length;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(filePath, bytes);
  return bytes.length;
}

const status = getImageProviderStatus();
if (!status.any) {
  console.error("no image provider (OPENAI_API_KEY or NANO_BANANA_API_KEY)");
  process.exit(1);
}

let wrote = 0;
for (const example of DETAIL_PAGE_OPEN_EXAMPLES) {
  console.log(`generate ${example.id}`);
  const shot = await generateDetailPageShots(example, { photos: [] });
  if (!shot.generated.length) {
    console.error(`${example.id} skipped=${shot.skipped || "empty"}`);
    if (shot.errors?.length) console.error(shot.errors.join("\n"));
    process.exit(1);
  }
  for (const photo of shot.generated) {
    const filePath = join(outDir, `${example.id}-${photo.slot}.png`);
    const bytes = await writeSrc(filePath, photo.src);
    const size = statSync(filePath).size;
    if (size < 8_000) {
      console.error(`${filePath} too small (${size})`);
      process.exit(1);
    }
    wrote += 1;
    console.log(`wrote ${example.id}-${photo.slot}.png ${bytes}b`);
  }
}

if (wrote < 6) {
  console.error(`expected 6 shots, wrote ${wrote}`);
  process.exit(1);
}
console.log(`ok generate-detail-page-sample-shots ${wrote}`);
