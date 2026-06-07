/**
 * 오케스트레이터 fallback — V2/V3·베타 가드 통과 시에만 사용자 출력
 */
import {
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
  researchGateBlockedResult,
} from "@/lib/content/v2PipelineGate";
import {
  buildDeliveryQualityHint,
  formatPostVerifyUserMessage,
} from "@/lib/product/customerOutput";
import { attachDeliveryTelemetry } from "@/lib/product/deliveryTelemetry";
import { deliverBlogDespiteGate } from "@/lib/product/deliverySoftPass";
import { LLM_USER_MESSAGES } from "@/lib/llm/messages";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
import { ensureV17MissionPolish, ensureNaverChannelClean } from "@/lib/content/v17PostProcess";

/**
 * @param {object} input
 * @param {object|null} pack
 * @param {object} [partial]
 */
export function gateOrchestratorBlogPack(input, pack, partial = {}) {
  const evalInput = { ...input, contentChannel: "blog" };
  pack = ensureV17MissionPolish(pack, evalInput, "blog");
  pack = ensureNaverChannelClean(pack, evalInput);

  if (!pack?.sections?.length) {
    const enriched = enrichMinimalBlogInput(evalInput);
    const { pack: fallback } = buildDeliverableBlogFallback({
      input: enriched,
      failures: ["empty_pack"],
    });
    pack = fallback;
    if (!pack?.sections?.length) {
      return {
        ok: false,
        blogContent: null,
        withheld: true,
        softPass: false,
        mode: partial.mode || "empty_pack",
        userMessage: partial.userMessage || LLM_USER_MESSAGES.qualityWithheld,
        userDetail: partial.userDetail ?? null,
        llmAvailable: partial.llmAvailable ?? false,
        baseContentLabel: partial.baseContentLabel ?? null,
        meta: {
          ...(partial.meta || {}),
          passOutput: false,
        },
      };
    }
  }

  if (!requiresV2ResearchGate(evalInput)) {
    const meta = attachDeliveryTelemetry(
      {
        ...(partial.meta || {}),
        passOutput: partial.meta?.passOutput ?? false,
        softPass: partial.softPass !== false,
        draftFallback: true,
        generationMode: partial.meta?.generationMode || "draft_fallback",
      },
      pack
    );
    return {
      ok: true,
      blogContent: pack,
      withheld: false,
      softPass: partial.softPass !== false,
      mode: partial.mode || "draft_fallback",
      userMessage:
        buildDeliveryQualityHint(meta, pack) ||
        partial.userMessage ||
        null,
      userDetail: partial.userDetail ?? LLM_USER_MESSAGES.draftFallbackDetail,
      llmAvailable: partial.llmAvailable ?? false,
      baseContentLabel: partial.baseContentLabel ?? null,
      meta,
    };
  }

  const gate = assertPostWriteDeliverable(evalInput, pack);
  if (!gate.ok) {
    const preview = deliverBlogDespiteGate(evalInput, pack, gate, {
      ...partial,
      mode: partial.mode || "draft_fallback_preview",
      llmAvailable: partial.llmAvailable ?? false,
      userMessage: null,
      userDetail: partial.userDetail ?? null,
      baseContentLabel: partial.baseContentLabel ?? null,
    });
    if (preview) {
      return {
        ...preview,
        meta: {
          ...(preview.meta || {}),
          ...(partial.meta || {}),
          draftFallback: partial.meta?.draftFallback ?? true,
        },
      };
    }
    return researchGateBlockedResult(
      evalInput,
      {
        ok: false,
        userMessage:
          formatPostVerifyUserMessage(gate) ||
          partial.userMessage ||
          LLM_USER_MESSAGES.qualityWithheld,
        reasons: gate.reasons || gate.failReasons,
        stage: gate.stage,
        betaTestGuard: gate.betaTestGuard,
      },
      pack
    );
  }

  return {
    ok: true,
    blogContent: gate.pack,
    withheld: false,
    softPass: false,
    mode: partial.mode || "draft_fallback",
    userMessage: null,
    userDetail: partial.userDetail ?? null,
    llmAvailable: partial.llmAvailable ?? true,
    baseContentLabel: partial.baseContentLabel ?? null,
    meta: {
      ...(partial.meta || {}),
      v2PipelineVerified: true,
      v3PipelineVerified: true,
      passOutput: true,
      softPass: false,
      draftFallback: partial.meta?.draftFallback ?? true,
      betaTestGuard: gate.betaTestGuard,
    },
  };
}

/**
 * @param {object} input
 * @param {object|null} pack
 * @param {string} channel
 * @param {object} [partial]
 */
export function gateOrchestratorChannelPack(input, pack, channel, partial = {}) {
  const evalInput = { ...input, contentChannel: channel };
  const key =
    channel === "place"
      ? "placeContent"
      : channel === "instagram"
        ? "instagramContent"
        : "imagePrompts";

  if (!pack) {
    return {
      ok: false,
      [key]: null,
      withheld: true,
      softPass: false,
      userMessage: LLM_USER_MESSAGES.unavailable,
      mode: "empty_channel",
    };
  }

  if (!requiresV2ResearchGate(evalInput)) {
    return {
      ok: true,
      [key]: pack,
      withheld: false,
      softPass: true,
      ...partial,
    };
  }

  const gate = assertPostWriteDeliverable(evalInput, pack);
  if (!gate.ok) {
    return {
      ok: false,
      [key]: null,
      withheld: true,
      softPass: false,
      userMessage:
        formatPostVerifyUserMessage(gate) || LLM_USER_MESSAGES.qualityWithheld,
      mode: gate.stage || "output_verification_failed",
      meta: { failReasons: gate.reasons },
    };
  }

  return {
    ok: true,
    [key]: gate.pack,
    withheld: false,
    softPass: false,
    meta: {
      ...(partial.meta || {}),
      v2PipelineVerified: true,
      passOutput: true,
    },
    ...partial,
  };
}
