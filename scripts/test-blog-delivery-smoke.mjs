/**
 * 블로그 생성 파이프라인 스모크 (서버 모듈 직접 호출)
 * node --import ./scripts/register-alias.mjs scripts/test-blog-delivery-smoke.mjs
 */
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { ensureBlogDelivery } from "../lib/generation/ensureBlogDelivery.js";
import { generateBlogWithLLMFirst } from "../lib/llm/contentOrchestrator.js";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const SAMPLE = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모3",
  mainKeyword: "오피모3",
  industry: "침대",
  storeFeatures: "수면 상담",
};

function mockResearchAsync(input) {
  return runResearch({
    query: input.researchQuery || `${input.brandName} ${input.topic}`,
    types: input.researchTypes || ["web"],
    brandContext: {
      brandName: input.brandName,
      region: input.region,
      topic: input.topic,
    },
    mode: input.researchMode || "v2_axis",
    regionKeywordHints: input.regionKeywordHints,
  }).then((research) => ({ research }));
}

function sectionChars(blog) {
  return (blog?.sections || [])
    .map((s) => String(s.body || "").replace(/\s/g, ""))
    .join("").length;
}

async function main() {
  const report = { at: new Date().toISOString(), steps: [] };

  const push = (name, ok, detail) => {
    report.steps.push({ name, ok, detail });
    const mark = ok ? "OK" : "FAIL";
    console.log(`${mark} ${name}: ${detail}`);
  };

  const pipelineInput = {
    ...SAMPLE,
    v2AxisRequired: true,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
  };

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput,
      generateResearchAsync: mockResearchAsync,
      onStep: (s) => console.log("  step:", s),
    });
    push(
      "applyV2AxisResearch",
      axis.ok === true,
      axis.ok
        ? `facts=${axis.factCount} tier=${axis.depthTier}`
        : axis.userMessage || "not ok"
    );

    if (!axis.ok) {
      writeReport(report);
      process.exit(1);
    }

    const delivered = await ensureBlogDelivery(pipelineInput, {
      setPipelineStep: (s) => console.log("  delivery:", s),
    });
    const chars = sectionChars(delivered.blogContent);
    push(
      "ensureBlogDelivery",
      Boolean(delivered.blogContent?.sections?.length && chars >= 400),
      `ok=${delivered.ok} mode=${delivered.mode} sections=${delivered.blogContent?.sections?.length ?? 0} chars=${chars} msg=${delivered.userMessage || "-"}`
    );

    const llm = await generateBlogWithLLMFirst({
      ...pipelineInput,
      _skipDefaultResearch: true,
    });
    const llmChars = sectionChars(llm.blogContent);
    push(
      "generateBlogWithLLMFirst",
      Boolean(llm.blogContent?.sections?.length),
      `ok=${llm.ok} withheld=${llm.withheld} mode=${llm.mode} sections=${llm.blogContent?.sections?.length ?? 0} chars=${llmChars} msg=${llm.userMessage || "-"}`
    );

    writeReport(report);
    const allOk = report.steps.every((s) => s.ok);
    process.exit(allOk ? 0 : 1);
  } catch (e) {
    push("exception", false, String(e.message || e));
    writeReport(report);
    process.exit(1);
  }
}

function writeReport(report) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    mkdirSync(join(root, "config"), { recursive: true });
    writeFileSync(
      join(root, "config", "blog-delivery-smoke.json"),
      JSON.stringify(report, null, 2)
    );
  } catch {
    /* ignore */
  }
}

main();
