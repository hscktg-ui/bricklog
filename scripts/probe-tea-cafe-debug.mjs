import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { fetchBlogWithRetry } = await import("../lib/generation/fetchBlogWithRetry.js");
const { assertPostWriteDeliverable } = await import("../lib/content/v2PipelineGate.js");
const { getBlogFullText } = await import("../utils/qualityCheck.js");

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

const { runResearch } = await import("../lib/research/runResearch.js");
const axis = await applyV2AxisResearch({
  pipelineInput: INPUT,
  generateResearchAsync: (input) =>
    runResearch({
      query: `${input.brandName} ${input.region} ${input.topic}`,
      types: ["web"],
      brandContext: { brandName: input.brandName, region: input.region, topic: input.topic },
      mode: "v2_axis",
    }).then((research) => ({ research })),
});
console.log("axis", { ok: axis.ok, facts: axis.factCount, msg: axis.userMessage });

const pipelineInput = { ...INPUT, ...axis.pipelineInput };
const partial = await fetchBlogWithRetry(pipelineInput, {});
const pack = partial?.blogContent || {};
const post = assertPostWriteDeliverable({ ...pipelineInput, contentChannel: "blog" }, pack);

console.log("fetch", {
  ok: partial?.ok,
  mode: partial?.mode,
  withheld: partial?.withheld,
  msg: partial?.userMessage,
  sections: pack.sections?.length,
  chars: getBlogFullText(pack).replace(/\s/g, "").length,
  generationMode: pack._meta?.generationMode,
});
console.log("postVerify", { ok: post.ok, stage: post.stage, reasons: post.reasons, msg: post.userMessage });
if (pack.title) {
  console.log("\n--- BODY ---\n", getBlogFullText(pack));
}
