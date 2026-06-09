/**
 * 티카페 실패 재현 + UI delivery 경로 디버그
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { resolveDeliveryFailureMessage } from "../lib/product/customerOutput.js";

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

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { ensureBlogDelivery } = await import("../lib/generation/ensureBlogDelivery.js");
const { resolveBlogUiDelivery } = await import("../lib/generation/postVerifySalvage.js");
const { runResearch } = await import("../lib/research/runResearch.js");
const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");

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
  }).then((research) => ({ research }));
}

const axis = await applyV2AxisResearch({
  pipelineInput: INPUT,
  generateResearchAsync: mockResearchAsync,
  onStep: (s) => console.log("  research:", s),
});
if (!axis.ok) {
  console.error("axis fail", axis);
  process.exit(1);
}

const pipelineInput = { ...INPUT, ...axis.pipelineInput };
console.log("facts:", pipelineInput.researchFacts?.length);

const r = await ensureBlogDelivery(pipelineInput, {
  setPipelineStep: (s) => console.log("  delivery:", s),
});

const delivery = resolveBlogUiDelivery(r.blogContent, pipelineInput, r);
const failReasons = delivery.gate?.reasons || r.meta?.failReasons || [];

const report = {
  ensure: {
    ok: r.ok,
    withheld: r.withheld,
    mode: r.mode,
    userMessage: r.userMessage,
    sections: r.blogContent?.sections?.length ?? 0,
    chars: r.blogContent ? getBlogFullText(r.blogContent).replace(/\s/g, "").length : 0,
    llmGenerated: r.blogContent?._meta?.llmGenerated,
    failReasons: r.meta?.failReasons,
  },
  uiDelivery: {
    ok: delivery.ok,
    userMessage: delivery.userMessage,
    gateReasons: delivery.gate?.reasons,
  },
  customerMessage: resolveDeliveryFailureMessage({ reasons: failReasons }),
};

console.log("\n=== REPORT ===");
console.log(JSON.stringify(report, null, 2));

console.log("\n=== LLM direct (API equivalent) ===");
const llm = await generateBlogWithLLMFirst({
  ...pipelineInput,
  _skipDefaultResearch: true,
});
console.log(
  JSON.stringify(
    {
      ok: llm.ok,
      withheld: llm.withheld,
      mode: llm.mode,
      userMessage: llm.userMessage,
      sections: llm.blogContent?.sections?.length,
      chars: llm.blogContent
        ? getBlogFullText(llm.blogContent).replace(/\s/g, "").length
        : 0,
      llmGenerated: llm.blogContent?._meta?.llmGenerated,
      failReasons: llm.meta?.failReasons,
    },
    null,
    2
  )
);

if (llm.blogContent?.sections?.length) {
  const { applyEditorPreOutputCorrection } = await import("../lib/content/editorPreOutputGate.js");
  const { assertPostWriteDeliverable } = await import("../lib/content/v2PipelineGate.js");
  const { runPostVerifyWithAutoRetry } = await import("../lib/generation/postVerifyWithRetry.js");
  const { shouldWithholdFailedPostVerify } = await import("../lib/content/betaTestGuardEngine.js");
  const { finalizeContentQualityForDelivery } = await import(
    "../lib/product/contentQualityDelivery.js"
  );
  const { salvageBlogPackForDelivery } = await import("../lib/generation/postVerifySalvage.js");

  const packStats = (p, label) => ({
    label,
    sections: p?.sections?.length ?? 0,
    chars: p ? getBlogFullText(p).replace(/\s/g, "").length : 0,
  });

  let blog = structuredClone(llm.blogContent);
  console.log("\n=== step trace ===", packStats(blog, "llm raw"));

  const { isLlmOriginatedPack } = await import("../lib/product/contentQualityDelivery.js");
  if (!isLlmOriginatedPack(blog)) {
    const corrected = applyEditorPreOutputCorrection(blog, pipelineInput, pipelineInput);
    blog = corrected.pack;
  }
  console.log(packStats(blog, "after editor skip-check"));

  const { deliverWithOptionalPostVerify } = await import("../lib/generation/ensureBlogDelivery.js");
  const { requiresV2ResearchGate } = await import("../lib/content/v2PipelineGate.js");
  const simulated = deliverWithOptionalPostVerify(
    pipelineInput,
    llm,
    requiresV2ResearchGate(pipelineInput),
    {}
  );
  console.log("\n=== simulated client deliver (API + postVerify) ===");
  console.log(
    JSON.stringify(
      {
        ok: simulated?.ok,
        withheld: simulated?.withheld,
        sections: simulated?.blogContent?.sections?.length,
        chars: simulated?.blogContent
          ? getBlogFullText(simulated.blogContent).replace(/\s/g, "").length
          : 0,
        publishReady: simulated?.blogContent?._meta?.publishReady,
        userMessage: simulated?.userMessage,
      },
      null,
      2
    )
  );

  const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
  console.log(packStats(salvaged, "salvage once"));

  const post0 = assertPostWriteDeliverable(pipelineInput, blog);
  console.log({ step: "assert raw", ok: post0.ok, reasons: post0.reasons });
  const verify = runPostVerifyWithAutoRetry(pipelineInput, blog, {});
  console.log("\n=== post verify on LLM pack ===");
  console.log(
    JSON.stringify(
      {
        verifyOk: verify.ok,
        verifyMsg: verify.userMessage,
        reasons: verify.post?.reasons,
        sectionsAfter: verify.pack?.sections?.length,
        charsAfter: verify.pack
          ? getBlogFullText(verify.pack).replace(/\s/g, "").length
          : 0,
        withhold: shouldWithholdFailedPostVerify(pipelineInput),
        assertAfter: assertPostWriteDeliverable(pipelineInput, verify.pack || blog),
      },
      null,
      2
    )
  );

  const fresh = structuredClone(llm.blogContent);
  fresh._meta = { ...fresh._meta, llmGenerated: true, generationMode: "llm_openai" };
  const finalized = finalizeContentQualityForDelivery(fresh, pipelineInput, "blog");
  console.log("\n=== after finalizeContentQualityForDelivery ===");
  console.log(
    JSON.stringify(
      {
        sections: finalized?.sections?.length,
        chars: getBlogFullText(finalized).replace(/\s/g, "").length,
        publishReady: finalized?._meta?.publishReady,
        golden: finalized?._meta?.goldenGate?.score,
        llmPolish: finalized?._meta?.llmDeliveryPolish,
      },
      null,
      2
    )
  );

  const ui2 = resolveBlogUiDelivery(finalized, pipelineInput, {
    ...llm,
    withheld: false,
  });
  console.log("\n=== UI delivery after finalize ===");
  console.log(JSON.stringify({ ok: ui2.ok, userMessage: ui2.userMessage }, null, 2));
}

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
report.simulatedClient = simulated
  ? {
      ok: simulated.ok,
      sections: simulated.blogContent?.sections?.length ?? 0,
      chars: simulated.blogContent
        ? getBlogFullText(simulated.blogContent).replace(/\s/g, "").length
        : 0,
      publishReady: simulated.blogContent?._meta?.publishReady,
    }
  : null;
writeFileSync(join(outDir, "debug-delivery.json"), JSON.stringify(report, null, 2));
