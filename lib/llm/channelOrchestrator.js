/**
 * BRICLOG 시그니처 채널 — place / instagram / image
 * 블로그와 동일: 조사·검증 → LLM 작성 → V3 후처리 → 출력 게이트
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { getLLMMode, isOpenAIConfigured } from "./llmProvider";
import {
  buildDeliverableChannelFallback,
} from "./channelDeliveryFallback";
import { gateOrchestratorChannelPack } from "./orchestratorDeliveryGate";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { buildChannelGenerationMessages } from "./buildChannelPrompt";
import { callOpenAIChat } from "./openaiClient";
import { parseChannelResponse } from "./parseChannelResponse";
import { postProcessLlmChannel } from "./postProcessLlmChannel";
import { LLM_USER_MESSAGES } from "./messages";
import { applyV2PersonaToInput } from "@/lib/constitution/writingConstitutionV2";
import { applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";
import { enrichMinimalBlogInput } from "./blogDeliveryFallback";
import {
  assertPreWriteVerified,
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
  researchGateBlockedResult,
} from "@/lib/content/v2PipelineGate";
import { withSignatureEnforcement } from "@/lib/content/channelPack";
import {
  CORE_MAX_REWRITES,
  CORE_TARGET_SCORE,
  needsCoreRegen,
  buildRegenPromptForFailures,
} from "@/lib/quality/coreQualityEngine";
import {
  needsV2AxisRegen,
  buildV2AxisRegenNote,
} from "@/lib/quality/v2AxisQuality";
import { needsV3Regen, buildV3RegenNote } from "@/lib/content/v3/pipeline";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { assessChannelFirstDeliveryQuality } from "@/lib/product/channelQualityStack";
import { buildPersonaEngineRegenNote } from "@/lib/persona/personaEngineProfile";

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

const MAX_ATTEMPTS = CORE_MAX_REWRITES;
const DERIVED_CHANNEL_MAX_ATTEMPTS = 2;
const DERIVED_CHANNEL_FAST_BUDGET_MS = 22_000;

export async function generateChannelWithLLMFirst(channel, input = {}) {
  if (!CONTENT_KEYS[channel]) {
    return { ok: false, userMessage: "지원하지 않는 채널입니다." };
  }

  const normalized = withSignatureEnforcement(
    applyV2PersonaToInput(applyV4SpeakerToInput(enrichMinimalBlogInput(input))),
    channel
  );

  const preWriteGate = assertPreWriteVerified(normalized);
  if (!preWriteGate.ok) {
    return researchGateBlockedChannelResult(channel, normalized, preWriteGate);
  }

  const mode = getLLMMode();
  if (mode === "brief_only" && !isOpenAIConfigured()) {
    const { pack, source } = buildDeliverableChannelFallback(channel, {
      input: normalized,
      sourceBlog: input._sourceBlogPack || null,
      instaTone: input.instaTone,
      failures: ["brief_only", "outline_blocked"],
    });
    if (pack) {
      return gateOrchestratorChannelPack(normalized, pack, channel, {
        mode: "draft_fallback",
        meta: { generationMode: source || "channel_fallback" },
      });
    }
  }

  const ctx = createPromptContext({
    ...normalized,
    contentChannel: channel,
  });

  const sensitive = resolveSensitiveCompliance({ ...normalized, ...ctx });
  const v2Gate = requiresV2ResearchGate(normalized);
  let lastFailures = [];
  let bestProcessed = null;
  let bestScore = -1;
  const loopStartedAt = Date.now();
  const isDerivedFromBlog = String(input.sourceChannel || "").toLowerCase() === "blog";
  const attemptLimit = isDerivedFromBlog
    ? Math.min(MAX_ATTEMPTS, DERIVED_CHANNEL_MAX_ATTEMPTS)
    : MAX_ATTEMPTS;

  for (let attempt = 0; attempt < attemptLimit; attempt++) {
    try {
      if (
        isDerivedFromBlog &&
        Date.now() - loopStartedAt > DERIVED_CHANNEL_FAST_BUDGET_MS
      ) {
        lastFailures = [...new Set([...(lastFailures || []), "channel_fast_budget_exceeded"])];
        break;
      }
      const v2AxisNote = needsV2AxisRegen(bestProcessed?.pack?._meta?.qualityScore?.v2Axis)
        ? buildV2AxisRegenNote(bestProcessed.pack._meta.qualityScore.v2Axis)
        : "";
      const personaRegenNote =
        attempt > 0 &&
        lastFailures.some((r) =>
          /persona|first_delivery|channel_marketer|channel_blog/.test(String(r))
        )
          ? buildPersonaEngineRegenNote(bestProcessed?.pack, normalized)
          : "";
      const coreRegenNote =
        attempt > 0 && lastFailures.length
          ? buildRegenPromptForFailures(lastFailures, normalized)
          : "";
      const regenNote = [coreRegenNote, v2AxisNote, personaRegenNote]
        .filter(Boolean)
        .join(" ");

      const messages = buildChannelGenerationMessages(channel, {
        ...ctx,
        ...normalized,
        sensitiveCompliance: sensitive,
        pipeline: {
          regenNote:
            regenNote ||
            (attempt > 0
              ? `검수 실패: ${lastFailures.join(", ")}. 브랜드·지역·주제 5회+, AI관용구 금지.`
              : null),
        },
      });

      const raw = await callOpenAIChat(
        messages,
        sensitive.isSensitive ? { temperature: 0.65, maxTokens: 3500 } : undefined
      );
      const parsed = parseChannelResponse(channel, raw, ctx);
      if (!parsed) {
        lastFailures = ["parse_failed"];
        continue;
      }

      const outlineCheck = detectOutlineLeak(parsed, channel);
      if (outlineCheck.isOutline) {
        lastFailures = [
          ...new Set([...(lastFailures || []), "outline_only_output"]),
        ];
        if (attempt < attemptLimit - 1) continue;
      }

      const processed = postProcessLlmChannel(
        channel,
        parsed,
        ctx,
        normalized
      );
      const coreQuality = processed.pack?._meta?.coreQuality;
      const scoreTotal =
        coreQuality?.total ?? processed.pack?._meta?.qualityScore?.total ?? 0;

      if (scoreTotal > bestScore) {
        bestScore = scoreTotal;
        bestProcessed = processed;
      }
      if (processed.pack?._meta) {
        processed.pack._meta.rewriteCount = attempt + 1;
      }

      const v2Axis = processed.pack?._meta?.qualityScore?.v2Axis;
      const v3Score = processed.pack?._meta?.qualityScore?.v3;

      if (needsCoreRegen(coreQuality) && attempt < attemptLimit - 1) {
        lastFailures = [...(coreQuality?.failReasons || [])];
        continue;
      }
      if (needsV2AxisRegen(v2Axis) && attempt < attemptLimit - 1) {
        lastFailures = [...(v2Axis?.failReasons || [])];
        continue;
      }
      if (
        normalized.v3EngineEnforced &&
        needsV3Regen(v3Score) &&
        attempt < attemptLimit - 1
      ) {
        lastFailures = [
          ...(v3Score?.failReasons || []),
          buildV3RegenNote(v3Score),
        ].filter(Boolean);
        continue;
      }

      const firstDeliveryReady =
        processed.pack?._meta?.firstDeliveryReady !== false &&
        processed.pack?._meta?.displayReady !== false &&
        processed.pack?._meta?.humanEditorPass !== false;

      if (v2Gate && !firstDeliveryReady && attempt < attemptLimit - 1) {
        const fd = assessChannelFirstDeliveryQuality(
          processed.pack,
          channel,
          normalized
        );
        lastFailures = [
          ...new Set([...(lastFailures || []), ...(fd.reasons || [])]),
        ];
        continue;
      }

      const hardPass =
        processed.passOutput &&
        firstDeliveryReady &&
        scoreTotal >= CORE_TARGET_SCORE &&
        (!v2Axis || v2Axis.ok) &&
        (!v3Score || v3Score.ok) &&
        (processed.pack?._meta?.channelSpecialQuality?.ok !== false);

      if (hardPass) {
        const deliver = assertPostWriteDeliverable(normalized, processed.pack);
        if (!deliver.ok) {
          lastFailures = deliver.reasons || ["output_verify_blocked"];
          if (attempt < attemptLimit - 1) continue;
          return researchGateBlockedChannelResult(channel, normalized, deliver);
        }
        return successChannelResult(
          channel,
          normalized,
          deliver.pack,
          processed,
          attempt + 1
        );
      }

      lastFailures = [
        ...(coreQuality?.failReasons || []),
        ...(v2Axis?.failReasons || []),
        ...(v3Score?.failReasons || []),
      ];
      if (!lastFailures.length) lastFailures.push("quality");
    } catch (err) {
      lastFailures = [err?.message || "llm_error"];
    }
  }

  if (bestProcessed?.pack) {
    const deliver = assertPostWriteDeliverable(normalized, bestProcessed.pack);
    if (deliver.ok && bestScore >= CORE_TARGET_SCORE) {
      return successChannelResult(
        channel,
        normalized,
        deliver.pack,
        bestProcessed,
        attemptLimit,
        { softPass: false }
      );
    }
  }

  const { pack, source } = buildDeliverableChannelFallback(channel, {
    input: normalized,
    sourceBlog: input._sourceBlogPack || null,
    bestPack: bestProcessed?.pack,
    instaTone: input.instaTone,
    failures: [...(lastFailures || []), "outline_fallback"],
  });
  if (pack) {
    return successChannelResult(
      channel,
      normalized,
      pack,
      bestProcessed || { pack },
      attemptLimit,
      { softPass: true }
    );
  }

  return researchGateBlockedChannelResult(channel, normalized, {
    ok: false,
    userMessage:
      "조사·검증·작성 단계를 마무리하지 못했습니다. 브랜드·지역·주제를 구체적으로 입력해 주세요.",
    reasons: lastFailures,
  });
}

function successChannelResult(
  channel,
  input,
  pack,
  processed,
  regenAttempts,
  { softPass = false } = {}
) {
  const key = CONTENT_KEYS[channel];
  return {
    ok: true,
    mode: "llm",
    llmAvailable: true,
    [key]: pack,
    softPass,
    meta: {
      v2PipelineVerified: true,
      v3PipelineVerified: true,
      generationMode: `llm_openai_${channel}`,
      passOutput: !softPass,
      contentChannel: channel,
      regenAttempts,
      qualityScore:
        pack._meta?.qualityScore?.total ?? pack._meta?.coreQuality?.total,
      failReasons: pack._meta?.failReasons || [],
    },
    userMessage: null,
    baseContentLabel: input.baseContentLabel || null,
  };
}

function researchGateBlockedChannelResult(channel, input, gate) {
  const key = CONTENT_KEYS[channel];
  return {
    ok: false,
    [key]: null,
    withheld: true,
    userMessage: gate?.userMessage || LLM_USER_MESSAGES.engineNotConnected,
    mode: "research_gate",
    meta: { failReasons: gate?.reasons || [], contentChannel: channel },
  };
}

export function blockUnverifiedChannelApiResponse(channel, result, input = {}) {
  if (!requiresV2ResearchGate(input)) return result;
  const key = CONTENT_KEYS[channel];
  if (!result?.[key]) return result;

  const gate = assertPostWriteDeliverable(input, result[key]);
  if (gate.ok) {
    return {
      ...result,
      [key]: gate.pack,
      withheld: false,
      meta: {
        ...(result.meta || {}),
        v2PipelineVerified: true,
        v3PipelineVerified: true,
      },
    };
  }

  if ((gate.reasons || []).includes("outline_only_output")) {
    const recovered = buildDeliverableChannelFallback(channel, {
      input,
      sourceBlog: input._sourceBlogPack || null,
      bestPack: result[key],
      instaTone: input.instaTone,
      failures: gate.reasons,
    }).pack;
    if (recovered) {
      const retry = assertPostWriteDeliverable(input, recovered);
      if (retry.ok) {
        return {
          ...result,
          ok: true,
          [key]: retry.pack,
          withheld: false,
          softPass: false,
          meta: {
            ...(result.meta || {}),
            v2PipelineVerified: true,
            v3PipelineVerified: true,
            generationMode: "outline_recovered",
            softPass: false,
            passOutput: true,
            betaTestGuard: retry.betaTestGuard,
          },
        };
      }
    }
  }

  return {
    ok: false,
    [key]: null,
    withheld: true,
    userMessage: gate.userMessage,
    mode: "output_verification_failed",
    meta: {
      failReasons: gate.reasons,
      v2PipelineVerified: false,
    },
  };
}
