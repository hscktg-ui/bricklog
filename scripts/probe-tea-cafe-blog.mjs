/**
 * 티카페 블로그 생성 프로브 — 벤치마크 미등록 업종
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { ensureBlogDelivery } = await import("../lib/generation/ensureBlogDelivery.js");
const { runResearch } = await import("../lib/research/runResearch.js");

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

function mockResearchAsync(input) {
  return runResearch({
    query: input.researchQuery || `${input.brandName} ${input.region} ${input.topic}`,
    types: input.researchTypes || ["web"],
    brandContext: {
      brandName: input.brandName,
      region: input.region,
      topic: input.topic,
      industry: input.industry,
    },
    mode: input.researchMode || "v2_axis",
    regionKeywordHints: input.regionKeywordHints,
  }).then((research) => ({ research }));
}

const axis = await applyV2AxisResearch({
  pipelineInput: INPUT,
  generateResearchAsync: mockResearchAsync,
  onStep: (s) => console.log("  research:", s),
});
if (!axis.ok) {
  console.error("research axis failed:", axis.userMessage || axis);
  process.exit(1);
}

const pipelineInput = { ...INPUT, ...axis.pipelineInput };
const r = await ensureBlogDelivery(pipelineInput, {
  setPipelineStep: (s) => console.log("  delivery:", s),
});
let pack = r.blogContent || {};
pack = finalizeContentQualityForDelivery(pack, pipelineInput, "blog") || pack;
const full = getBlogFullText(pack);
const gate = pack._meta?.goldenGate || r.meta?.goldenGate;

const meta = {
  ok: r.ok,
  withheld: r.withheld,
  mode: r.mode,
  industry: "tea_cafe",
  sections: pack.sections?.length,
  chars: full.replace(/\s/g, "").length,
  goldenScore: gate?.score,
  goldenVerdict: gate?.verdict,
  haeshinScore: gate?.haeshin?.score,
  publishReady: pack._meta?.publishReady,
};

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
writeFileSync(
  join(outDir, "article.md"),
  [
    `# ${pack.title || "(no title)"}`,
    "",
    ...(pack.sections || []).flatMap((sec) => [
      sec.heading ? `## ${sec.heading}` : "",
      sec.body || "",
      "",
    ]),
    pack.conclusion ? `## 마무리\n\n${pack.conclusion}` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n"),
  "utf8"
);

console.log("=== META ===");
console.log(JSON.stringify(meta, null, 2));
console.log("\n=== TITLE ===");
console.log(pack.title || "(no title)");
console.log("\n=== BODY ===");
for (const sec of pack.sections || []) {
  if (sec.heading) console.log(`\n## ${sec.heading}`);
  console.log(sec.body || "");
}
if (pack.conclusion) {
  console.log("\n=== CONCLUSION ===");
  console.log(pack.conclusion);
}
