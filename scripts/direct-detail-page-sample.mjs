/**
 * GPT-5.6로 맛보기 상세 카피를 쓰고 directed JSON으로 굽는다.
 * Grok 키가 있으면 아트도 찍는다. 이미지 생성은 --images.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDetailPagePack } from "../lib/product/detailPageEngine.js";
import { DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { isGrokConfigured } from "../lib/llm/grokClient.js";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import { generateDetailPageShots } from "../lib/product/detailPageShotGen.js";

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
  /* no env */
}

const withImages = process.argv.includes("--images");
const outDir = join(root, "lib", "product", "directed");
mkdirSync(outDir, { recursive: true });

if (!isOpenAIConfigured()) {
  console.error("OPENAI_API_KEY missing");
  process.exit(1);
}

const ids = process.argv.filter((a) => a.startsWith("open-"));
const targets = DETAIL_PAGE_OPEN_EXAMPLES.filter(
  (ex) => !ids.length || ids.includes(ex.id)
);

for (const example of targets) {
  console.log(`direct ${example.id} grok=${isGrokConfigured()} images=${withImages}`);
  const result = await generateDetailPagePack(example, {
    allowLlm: true,
    allowImages: withImages,
    logLlmError: true,
  });
  const pack = result.pack;
  const payload = {
    id: example.id,
    grok: pack._meta?.director?.grok === true,
    mode: pack._meta?.mode,
    productName: pack.productName,
    brandName: pack.brandName,
    sections: (pack.sections || []).map((s) => ({
      type: s.type,
      kicker: s.kicker || "",
      title: s.title || "",
      body: s.body || "",
      rows: s.rows || [],
      bullets: s.bullets || [],
      composition: s.composition || "",
    })),
  };
  const file = join(outDir, `${example.id}.json`);
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `wrote ${file} mode=${payload.mode} sections=${payload.sections.length} director=${JSON.stringify(pack._meta?.director || {})}`
  );
  console.log(
    payload.sections
      .map((s) => `${s.type}:${String(s.title || "").slice(0, 24)}`)
      .join(" | ")
  );

  if (withImages) {
    const shot = await generateDetailPageShots(example, {
      photos: [],
      generateMissing: true,
    });
    console.log(`shots generated=${shot.generated?.length || 0} skip=${shot.skipped || ""}`);
  }
}
