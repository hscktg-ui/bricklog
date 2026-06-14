import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

import { slimBlogApiPayload } from "@/lib/generation/slimBlogApiPayload";
import { assertPreWriteVerified } from "@/lib/content/v2PipelineGate";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import { runResearch } from "@/lib/research/runResearch";

const RAW = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

console.log("=== API raw (no client research) ===");
const slimRaw = slimBlogApiPayload(RAW);
let gate = assertPreWriteVerified(slimRaw);
console.log("preWrite:", gate.ok ? "OK" : gate.stage, gate.reasons, gate.userMessage?.slice(0, 90));

console.log("\n=== After client axis + slim (prod path) ===");
const pipelineInput = { ...RAW };
await applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync: (input) =>
    runResearch({
      query: `${input.brandName} ${input.region} ${input.topic}`,
      types: ["web"],
      brandContext: input,
      mode: "v2_axis",
    }).then((research) => ({ research })),
});
const slim = slimBlogApiPayload(pipelineInput);
gate = assertPreWriteVerified(slim);
console.log("preWrite:", gate.ok ? "OK" : gate.stage, gate.reasons, gate.userMessage?.slice(0, 90));
console.log("facts:", slim.researchFactCount, "ready:", slim.v2ResearchReady);

console.log("\n=== generateBlogWithLLMFirst (slim after axis) ===");
const result = await generateBlogWithLLMFirst(slim);
console.log({
  ok: result.ok,
  withheld: result.withheld,
  mode: result.mode,
  userMessage: result.userMessage?.slice(0, 100),
  sections: result.blogContent?.sections?.length,
});
