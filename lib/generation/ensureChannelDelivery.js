import {
  assertPreWriteVerified,
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
} from "@/lib/content/v2PipelineGate";
import { CUSTOMER_PIPELINE_STEP_LABELS, formatPostVerifyUserMessage } from "@/lib/product/customerOutput";
import { fetchChannelWithRetry } from "@/lib/generation/fetchChannelWithRetry";
import { isChannelPackDeliverable } from "@/lib/content/channelPack";
import {
  buildDeliverableChannelFallback,
  ensurePublishableChannelPack,
} from "@/lib/llm/channelDeliveryFallback";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { getChannelFullText } from "@/lib/content/channelPack";
import { scoreCoreContent } from "@/lib/quality/coreQualityEngine";
import { DEFAULT_QUALITY_TARGET } from "@/lib/quality/qualityDefaults";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { applyAGradeChannelPass } from "@/lib/product/aGradeDeliveryEngine";

function finalizeChannelForDelivery(channel, content, pipelineInput) {
  if (!content) return content;
  return applyAGradeChannelPass(content, channel, pipelineInput);
}

function channelThinHighScoreBlocked(channel, pack, input = {}) {
  if (!isBriclogMissionEnforced() || !pack) return false;
  if (channel !== "place" && channel !== "instagram") return false;
  const text = getChannelFullText(pack, channel);
  const chars = text.replace(/\s/g, "").length;
  const minChars = channel === "place" ? 100 : 140;
  if (chars >= minChars) return false;
  const core = scoreCoreContent(pack, { input }, channel);
  return core.total >= DEFAULT_QUALITY_TARGET;
}

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

function hasDeliverable(channel, content) {
  return isChannelPackDeliverable(channel, content);
}

/**
 * 시그니처 채널 — 조사·검증·LLM·출력 (검수 미달 시 출력 금지)
 */
export async function ensureChannelDelivery(channel, pipelineInput, hooks = {}) {
  const key = CONTENT_KEYS[channel];
  if (!key) {
    return { ok: false, userMessage: "지원하지 않는 채널입니다." };
  }

  const { setPipelineStep, sourceBlog = null } = hooks;
  const v2Gate = requiresV2ResearchGate(pipelineInput);

  if (v2Gate) {
    setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.researchVerify);
    const pre = assertPreWriteVerified(pipelineInput);
    if (!pre.ok) {
      return {
        ok: false,
        [key]: null,
        userMessage: pre.userMessage,
        mode:
          pre.stage === "research_verify" || pre.reasons?.includes("missing_axes")
            ? "research_verify_blocked"
            : "knowledge_expansion_blocked",
        meta: {
          failReasons: pre.reasons || [],
          preGenerationMetrics: pre.preGenerationMetrics || null,
        },
      };
    }
    setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.write);
  }

  try {
    const partial = await fetchChannelWithRetry(channel, pipelineInput, hooks);
    if (partial?.ok === false && partial?.[key]) {
      partial.ok = true;
    }

    let content = ensurePublishableChannelPack(
      channel,
      partial?.[key],
      pipelineInput,
      { sourceBlog, instaTone: pipelineInput.instaTone }
    );
    content = applyChannelStoryGate(
      content,
      channel,
      { input: pipelineInput, ...pipelineInput }
    );
    content = applyHumanityFinishPass(
      content,
      { input: pipelineInput, ...pipelineInput },
      channel
    );
    content = weaveResearchFactsIntoChannelPack(content, channel, pipelineInput);
    if (channelThinHighScoreBlocked(channel, content, pipelineInput)) {
      return {
        ok: false,
        [key]: null,
        withheld: true,
        userMessage:
          "채널 본문이 짧아 화면에 올리지 않았어요. 「다시 받기」로 한 번 더 받아 보세요.",
        mode: "channel_short_high_score",
        meta: {
          failReasons: ["channel_short_high_score"],
          contentChannel: channel,
        },
      };
    }
    if (hasDeliverable(channel, content)) {
      if (v2Gate) {
        setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.review);
        const post = assertPostWriteDeliverable(pipelineInput, content);
        if (!post.ok) {
          return {
            ok: false,
            [key]: null,
            withheld: true,
            userMessage:
              post.userMessage || formatPostVerifyUserMessage(post),
            mode: "output_verify_blocked",
            meta: {
              failReasons: post.reasons || [],
              v2PipelineVerified: false,
              passOutput: false,
              contentChannel: channel,
            },
          };
        }
        const delivered = finalizeChannelForDelivery(channel, post.pack, pipelineInput);
        return {
          ...partial,
          ok: true,
          [key]: delivered,
          softPass: false,
          userMessage: null,
          meta: {
            ...(partial.meta || {}),
            v2PipelineVerified: true,
            v3PipelineVerified: true,
            softPass: false,
            passOutput: true,
          },
        };
      }
      return {
        ...partial,
        ok: partial.ok !== false,
        [key]: finalizeChannelForDelivery(channel, content, pipelineInput),
      };
    }

    if (partial?.[key]) {
      const recovered = ensurePublishableChannelPack(
        channel,
        partial[key],
        pipelineInput,
        { sourceBlog, instaTone: pipelineInput.instaTone }
      );
      if (hasDeliverable(channel, recovered)) {
        const finalized = finalizeChannelForDelivery(channel, recovered, pipelineInput);
        if (isBriclogMissionEnforced()) {
          return { ...partial, ok: partial.ok !== false, [key]: finalized };
        }
        return {
          ...partial,
          ok: true,
          [key]: finalized,
          softPass: true,
          meta: {
            ...(partial.meta || {}),
            generationMode: "channel_outline_recovered",
            softPass: true,
          },
        };
      }
    }
  } catch (err) {
    return buildLocalChannelDelivery(channel, pipelineInput, null, {
      sourceBlog,
      failures: [err?.message || "api_error"],
    });
  }

  return buildLocalChannelDelivery(channel, pipelineInput, null, {
    sourceBlog,
    failures: ["empty_channel"],
  });
}

function buildLocalChannelDelivery(
  channel,
  pipelineInput,
  partial,
  { sourceBlog, failures = [] } = {}
) {
  const key = CONTENT_KEYS[channel];
  let { pack, source } = buildDeliverableChannelFallback(channel, {
    input: pipelineInput,
    sourceBlog,
    bestPack: partial?.[key],
    instaTone: pipelineInput.instaTone,
    failures,
  });
  if (!pack || !hasDeliverable(channel, pack)) {
    return {
      ok: false,
      [key]: null,
      userMessage: "콘텐츠를 생성하지 못했습니다.",
      mode: "empty_channel",
    };
  }

  if (requiresV2ResearchGate(pipelineInput)) {
    const post = assertPostWriteDeliverable(
      { ...pipelineInput, contentChannel: channel },
      pack
    );
    if (!post.ok) {
      return {
        ok: false,
        [key]: null,
        withheld: true,
        softPass: false,
        userMessage:
          post.userMessage ||
          formatPostVerifyUserMessage(post) ||
          "아직 올리지 않았어요. 입력을 확인한 뒤 다시 시도해 주세요.",
        mode: post.stage || "output_verify_blocked",
        meta: {
          generationMode: "beta_test_guard_blocked",
          failReasons: post.reasons || [],
          betaTestGuard: post.betaTestGuard,
        },
      };
    }
    pack = post.pack;
  }

  pack = applyChannelStoryGate(
    pack,
    channel,
    { input: pipelineInput, ...pipelineInput }
  );
  pack = applyHumanityFinishPass(
    pack,
    { input: pipelineInput, ...pipelineInput },
    channel
  );
  pack = finalizeChannelForDelivery(channel, pack, pipelineInput);

  return {
    ok: true,
    [key]: pack,
    softPass: false,
    withheld: false,
    userMessage: null,
    mode: "draft_fallback",
    meta: {
      generationMode: source,
      draftFallback: true,
      softPass: false,
      passOutput: true,
      v2PipelineVerified: Boolean(requiresV2ResearchGate(pipelineInput)),
      contentChannel: channel,
      betaTestGuard: pack._meta?.betaTestGuardCorrected,
    },
  };
}
