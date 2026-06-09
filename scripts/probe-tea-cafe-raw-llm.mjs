/**
 * 티카페 — LLM 직출 + 품질 마감만 (salvage 우회)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createPromptContext } from "../utils/promptBuilder.js";
import { prepareUltimateBlogContext } from "../lib/ultimate/runUltimateEngine.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { buildBlogGenerationMessages } from "../lib/llm/buildBlogPrompt.js";
import { callOpenAIChat } from "../lib/llm/openaiClient.js";
import { parseLlmBlogResponse } from "../lib/llm/postProcessLlmBlog.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { ensureMissionProseTierLength } from "../lib/content/missionProseGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { runResearch } from "../lib/research/runResearch.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

const BASE = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
};

const axis = await applyV2AxisResearch({
  pipelineInput: { ...BASE, v2AxisRequired: true },
  generateResearchAsync: (input) =>
    runResearch({
      query: `${input.brandName} ${input.region} 티카페 가을 메뉴`,
      types: ["web"],
      brandContext: { brandName: input.brandName, region: input.region, topic: input.topic },
      mode: "v2_axis",
    }).then((research) => ({ research })),
});

const input = enrichMinimalBlogInput({ ...BASE, ...axis.pipelineInput, v2PreWriteVerified: true });
const ctx = createPromptContext(input);
const prep = prepareUltimateBlogContext({ ...ctx, ...input });
const buildCtx = { ...prep.ctx, ...input, input };

const messages = buildBlogGenerationMessages(buildCtx);
const raw = await callOpenAIChat(messages, { temperature: 0.72, maxTokens: 3200 });
const parsed = parseLlmBlogResponse(raw, buildCtx);
if (!parsed) {
  console.error("LLM parse failed", raw?.slice?.(0, 500));
  process.exit(1);
}

const beforeChars = getBlogFullText(parsed).replace(/\s/g, "").length;
writeFileSync(join(root, "artifacts", "probe-tea-cafe", "llm-parsed.json"), JSON.stringify(parsed, null, 2), "utf8");

let pack = {
  ...parsed,
  _meta: {
    ...(parsed._meta || {}),
    llmGenerated: true,
    generationMode: "llm_openai",
  },
};
const afterTier = getBlogFullText(pack).replace(/\s/g, "").length;
pack = finalizeContentQualityForDelivery(pack, input, "blog");

const full = getBlogFullText(pack);
const meta = {
  facts: axis.factCount,
  beforeChars,
  afterTierChars: afterTier,
  chars: full.replace(/\s/g, "").length,
  golden: pack._meta?.goldenGate,
  publishReady: pack._meta?.publishReady,
  title: pack.title,
};

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "meta-raw-llm.json"), JSON.stringify(meta, null, 2), "utf8");
writeFileSync(join(outDir, "article-raw-llm.md"), full, "utf8");

console.log(JSON.stringify(meta, null, 2));
console.log("\n---\n", full);
