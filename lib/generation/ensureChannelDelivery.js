import { createPromptContext } from "@/utils/promptBuilder";
import {
  assertPreWriteVerified,
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
} from "@/lib/content/v2PipelineGate";
import { fetchChannelWithRetry } from "@/lib/generation/fetchChannelWithRetry";
import { isChannelPackDeliverable } from "@/lib/content/channelPack";

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

function hasDeliverable(channel, content) {
  return isChannelPackDeliverable(channel, content);
}

/**
 * 시그니처 채널 — 조사·검증·LLM·출력 게이트 (블로그와 동일 구조)
 */
export async function ensureChannelDelivery(channel, pipelineInput, hooks = {}) {
  const key = CONTENT_KEYS[channel];
  if (!key) {
    return { ok: false, userMessage: "지원하지 않는 채널입니다." };
  }

  const { setPipelineStep } = hooks;
  const v2Gate = requiresV2ResearchGate(pipelineInput);

  if (v2Gate) {
    const pre = assertPreWriteVerified(pipelineInput);
    if (!pre.ok) {
      return {
        ok: false,
        [key]: null,
        userMessage: pre.userMessage,
        mode: "research_verify_blocked",
      };
    }
    setPipelineStep?.("콘텐츠 작성 중…");
  }

  try {
    const partial = await fetchChannelWithRetry(channel, pipelineInput, hooks);
    if (partial?.ok === false && !partial?.[key]) {
      return partial;
    }

    const content = partial?.[key];
    if (hasDeliverable(channel, content)) {
      if (v2Gate) {
        setPipelineStep?.("최종 검수 중…");
        const post = assertPostWriteDeliverable(pipelineInput, content);
        if (!post.ok) {
          return {
            ok: false,
            [key]: null,
            userMessage: post.userMessage,
            mode: "output_verify_blocked",
          };
        }
        return {
          ...partial,
          ok: true,
          [key]: post.pack,
          meta: {
            ...(partial.meta || {}),
            v2PipelineVerified: true,
            v3PipelineVerified: true,
          },
        };
      }
      return { ...partial, ok: partial.ok !== false };
    }
  } catch (err) {
    return {
      ok: false,
      [key]: null,
      userMessage: err?.message || "생성에 실패했습니다.",
      mode: "api_error",
    };
  }

  if (v2Gate) {
    return {
      ok: false,
      [key]: null,
      userMessage:
        "조사·검증·작성 단계를 마무리하지 못했습니다. 브랜드·지역·주제를 확인해 주세요.",
      mode: "v2_pipeline_no_fallback",
    };
  }

  return {
    ok: false,
    [key]: null,
    userMessage: "콘텐츠를 생성하지 못했습니다.",
  };
}
