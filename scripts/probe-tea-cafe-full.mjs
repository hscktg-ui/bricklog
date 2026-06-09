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
} catch {}

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { runResearch } = await import("../lib/research/runResearch.js");
const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");

const BASE = {
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
  betaTestGuardEnforced: false,
};

const axis = await applyV2AxisResearch({
  pipelineInput: BASE,
  generateResearchAsync: (input) =>
    runResearch({
      query: `${input.brandName} ${input.region} ${input.topic}`,
      types: ["web"],
      brandContext: {
        brandName: input.brandName,
        region: input.region,
        topic: input.topic,
        industry: input.industry,
      },
      mode: "v2_axis",
    }).then((research) => ({ research })),
});

if (!axis.ok) {
  console.error("axis fail", axis);
  process.exit(1);
}

const INPUT = {
  ...BASE,
  ...axis.pipelineInput,
  v2PreWriteVerified: true,
  _skipDefaultResearch: true,
};

const r = await generateBlogWithLLMFirst(INPUT);
let pack = finalizeContentQualityForDelivery(r.blogContent || {}, INPUT, "blog") || r.blogContent || {};
const full = getBlogFullText(pack);

const meta = {
  ok: r.ok,
  mode: r.mode,
  withheld: r.withheld,
  facts: axis.factCount,
  chars: full.replace(/\s/g, "").length,
  golden: pack._meta?.goldenGate,
  publishReady: pack._meta?.publishReady,
  generationMode: pack._meta?.generationMode,
  failReasons: r.meta?.failReasons?.slice(0, 8),
};

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "meta-full.json"), JSON.stringify(meta, null, 2), "utf8");
writeFileSync(join(outDir, "article-full.md"), full, "utf8");

console.log(JSON.stringify(meta, null, 2));
console.log("\n--- ARTICLE ---\n");
console.log(full);
