import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
import { buildBaseContentLabel } from "@/lib/contentPipeline";
import { fetchBlogWithRetry } from "@/lib/generation/fetchBlogWithRetry";
import {
  assertPreWriteVerified,
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
} from "@/lib/content/v2PipelineGate";

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
  const v2Gate = requiresV2ResearchGate(pipelineInput);
  let partial = null;

  if (v2Gate) {
    const pre = assertPreWriteVerified(pipelineInput);
    if (!pre.ok) {
      return {
        ok: false,
        blogContent: null,
        userMessage: pre.userMessage,
        mode: "research_verify_blocked",
      };
    }
    setPipelineStep?.("콘텐츠 작성 중…");
  }

  try {
    partial = await fetchBlogWithRetry(pipelineInput, hooks);
    if (partial?.ok === false && !partial?.blogContent) {
      return partial;
    }

    if (hasDeliverableBlog(partial?.blogContent)) {
      if (v2Gate) {
        setPipelineStep?.("최종 검수 중…");
        const post = assertPostWriteDeliverable(
          pipelineInput,
          partial.blogContent
        );
        if (!post.ok) {
          return {
            ok: false,
            blogContent: null,
            userMessage: post.userMessage,
            mode: "output_verify_blocked",
          };
        }
        return {
          ...partial,
          ok: true,
          blogContent: post.pack,
          meta: {
            ...(partial.meta || {}),
            v2PipelineVerified: true,
            v3PipelineVerified: true,
          },
        };
      }
      return { ...partial, ok: partial.ok !== false };
    }
  } catch {
  }

  if (v2Gate) {
    return {
      ok: false,
      blogContent: null,
      userMessage:
        "조사·검증·작성 단계를 마무리하지 못했습니다. 브랜드·지역·주제를 확인해 주세요.",
      mode: "v2_pipeline_no_fallback",
    };
  }

  setPipelineStep?.("글을 화면에 준비하는 중…");
  return buildLocalDeliveryResult(
    pipelineInput,
    partial,
    partial ? ["api_incomplete"] : ["api_unreachable"]
  );
}
