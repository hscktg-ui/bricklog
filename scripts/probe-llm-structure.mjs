import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* ignore */
}

process.env.BRICLOG_MISSION = "true";

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { runResearch } = await import("../lib/research/runResearch.js");
const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");
const { hasSubstantiveLlmBody, finalizeContentQualityForDelivery } = await import(
  "../lib/product/contentQualityDelivery.js"
);
const { getBlogFullText } = await import("../utils/qualityCheck.js");
const { forceLocalBlogPreviewDelivery } = await import("../lib/generation/ensureBlogDelivery.js");

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

const axis = await applyV2AxisResearch({
  pipelineInput: INPUT,
  generateResearchAsync: (i) =>
    runResearch({
      query: `${i.brandName} ${i.region} ${i.topic}`,
      types: ["web"],
      brandContext: {
        brandName: i.brandName,
        region: i.region,
        topic: i.topic,
        industry: i.industry,
      },
      mode: "v2_axis",
    }).then((research) => ({ research })),
});

const pipelineInput = { ...INPUT, ...axis.pipelineInput, _skipDefaultResearch: true };
const llm = await generateBlogWithLLMFirst(pipelineInput);
const bc = llm.blogContent;

console.log("llm", {
  mode: llm.mode,
  ok: llm.ok,
  sections: bc?.sections?.length ?? 0,
  chars: bc ? getBlogFullText(bc).replace(/\s/g, "").length : 0,
  substantive: hasSubstantiveLlmBody(bc),
});

if (bc?.sections?.length) {
  const polished = finalizeContentQualityForDelivery(bc, pipelineInput, "blog");
  console.log("polished", {
    sections: polished?.sections?.length ?? 0,
    chars: getBlogFullText(polished).replace(/\s/g, "").length,
    substantive: hasSubstantiveLlmBody(polished),
  });
}

const rescued = forceLocalBlogPreviewDelivery(pipelineInput, llm);
console.log("forceLocal", {
  ok: rescued?.ok,
  mode: rescued?.mode,
  sections: rescued?.blogContent?.sections?.length ?? 0,
});
