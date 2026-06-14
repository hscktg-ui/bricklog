/**
 * 조사·검증 게이트 실패 원인 진단 (티카페·얇은 업종)
 */
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

import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import { assertPreWriteVerified } from "@/lib/content/v2PipelineGate";
import { assertResearchVerificationGate } from "@/lib/evolution/researchVerificationGate";
import { assessResearchDepth } from "@/lib/evolution/researchDepthEngine";
import { assertResearchFirstWritable } from "@/lib/product/briclogResearchFirstPipeline";
import { ensureBlogDelivery } from "@/lib/generation/ensureBlogDelivery";
import { runResearch } from "@/lib/research/runResearch";

const CASES = [
  {
    id: "tea_cafe",
    input: {
      brandName: "다온티하우스",
      region: "경주",
      topic: "가을 시즌 티 메뉴와 다실 분위기",
      mainKeyword: "경주 티카페",
      industry: "티카페",
      blogLengthTier: "medium",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "minimal_cafe",
    input: {
      brandName: "모닝브루",
      region: "강남",
      topic: "브런치",
      industry: "카페",
      blogLengthTier: "medium",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
];

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

for (const c of CASES) {
  console.log(`\n=== ${c.id} ===`);
  const pipelineInput = { ...c.input };
  const axis = await applyV2AxisResearch({
    pipelineInput,
    generateResearchAsync: mockResearchAsync,
  });
  if (!axis.ok) {
    console.log("axis FAIL:", axis.userMessage, axis.reasons);
    continue;
  }
  const input = { ...pipelineInput };
  console.log("facts:", input.researchFactCount, "stage:", input.v2PipelineStage, "ready:", input.v2ResearchReady);

  const depth = assessResearchDepth(input);
  console.log("researchDepth:", depth);

  const verify = assertResearchVerificationGate(input);
  console.log("researchVerify:", verify.ok ? "OK" : verify.reasons, verify.metrics?.infoCount);

  const preWrite = assertPreWriteVerified(input);
  console.log("preWrite:", preWrite.ok ? "OK" : preWrite.stage, preWrite.reasons, preWrite.userMessage?.slice(0, 80));

  const rf = assertResearchFirstWritable(input);
  if (!rf.ok) console.log("researchFirst:", rf.reasons, rf.userMessage?.slice(0, 80));

  const delivery = await ensureBlogDelivery(input, { setPipelineStep: (s) => console.log("  step:", s) });
  console.log("delivery:", {
    ok: delivery.ok,
    withheld: delivery.withheld,
    mode: delivery.mode,
    userMessage: delivery.userMessage?.slice(0, 100),
    sections: delivery.blogContent?.sections?.length,
  });
}
