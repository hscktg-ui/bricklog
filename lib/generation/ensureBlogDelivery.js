import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
import { buildBaseContentLabel } from "@/lib/contentPipeline";
import { fetchBlogWithRetry } from "@/lib/generation/fetchBlogWithRetry";

function hasDeliverableBlog(content) {
  if (!content) return false;
  const sections = content.sections || [];
  if (!sections.length) return false;
  const chars = sections
    .map((s) => String(s.body || "").replace(/\s/g, ""))
    .join("").length;
  return chars >= 400;
}

function buildLocalDeliveryResult(pipelineInput, partial = {}, failures = []) {
  const enriched = enrichMinimalBlogInput(pipelineInput);
  const ctx = createPromptContext({
    ...enriched,
    researchBrief: pipelineInput.researchBrief,
  });
  const prep = prepareUltimateBlogContext({ ...enriched, ...ctx });
  const { pack } = buildDeliverableBlogFallback({
    input: enriched,
    prep,
    bestPack: partial?.blogContent,
    failures,
  });
  return {
    ok: true,
    mode: "draft_fallback",
    llmAvailable: partial?.llmAvailable ?? false,
    blogContent: pack,
    softPass: true,
    withheld: false,
    userMessage: null,
    userDetail: null,
    baseContentLabel:
      partial?.baseContentLabel ||
      buildBaseContentLabel(enriched, pack),
    meta: {
      generationMode: "local_delivery_fallback",
      draftFallback: true,
      blogCharCount: pack._meta?.charCount,
    },
    personalization: partial?.personalization,
    usageWarning: partial?.usageWarning,
    usage: partial?.usage,
  };
}

/**
 * API 실패·타임아웃·빈 응답이어도 화면에 쓸 글을 반환
 */
export async function ensureBlogDelivery(pipelineInput, hooks = {}) {
  const { setPipelineStep } = hooks;
  let partial = null;

  try {
    partial = await fetchBlogWithRetry(pipelineInput, hooks);
    if (hasDeliverableBlog(partial?.blogContent)) {
      return partial;
    }
  } catch {
  }

  setPipelineStep?.("글을 화면에 준비하는 중…");
  return buildLocalDeliveryResult(
    pipelineInput,
    partial,
    partial ? ["api_incomplete"] : ["api_unreachable"]
  );
}
