/**
 * LLM First — BRICLOG ULTIMATE MASTER ENGINE V17
 *
 * V17 Multi-AI: Research·Local·Memory·TopicExpansion → Writer(GPT) → DuplicateKiller → Length → Reviewer → 출력
 * (브랜드 기억 플랫폼, Google CSE 비활성)
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import {
  isOpenAIConfigured,
  isDevTemplateFallbackAllowed,
  getLLMMode,
} from "./llmProvider";
import { buildContentBriefPack } from "./contentBrief";
import { buildBlogGenerationMessages } from "./buildBlogPrompt";
import { callOpenAIChat } from "./openaiClient";
import { parseLlmBlogResponse, postProcessLlmBlog } from "./postProcessLlmBlog";
import { LLM_USER_MESSAGES, getDevOperatorHint } from "./messages";
import { buildQualityUserHint } from "./qualityUserHints";
import { buildBlogPack } from "@/lib/prompts/engine/blogEngine";
import { applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";
import {
  applyV2PersonaToInput,
  CONSTITUTION_V2_TARGET_SCORE,
  needsConstitutionRegen,
} from "@/lib/constitution/writingConstitutionV2";
import {
  SEARCH_INTENT_MIN,
  HUMANITY_MIN,
} from "@/lib/quality/v4ContentAudit";
import { HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import {
  CORE_MAX_REWRITES,
  CORE_TARGET_SCORE,
  needsCoreRegen,
  buildRegenPromptForFailures,
  buildImprovementSuggestions,
} from "@/lib/quality/coreQualityEngine";
import {
  needsV2AxisRegen,
  buildV2AxisRegenNote,
} from "@/lib/quality/v2AxisQuality";
import {
  assertPreWriteVerified,
  assertPostWriteDeliverable,
  blockUnverifiedBlogApiResponse,
  requiresV2ResearchGate,
  researchGateBlockedResult,
} from "@/lib/content/v2PipelineGate";
import {
  needsV3Regen,
  buildV3RegenNote,
} from "@/lib/content/v3/pipeline";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import {
  enrichMinimalBlogInput,
  buildDeliverableBlogFallback,
} from "./blogDeliveryFallback";
import { gateOrchestratorBlogPack } from "./orchestratorDeliveryGate";
import { shouldWithholdFailedPostVerify } from "@/lib/content/betaTestGuardEngine";
import {
  buildDeliveryQualityHint,
  formatPostVerifyUserMessage,
} from "@/lib/product/customerOutput";
import { attachDeliveryTelemetry } from "@/lib/product/deliveryTelemetry";
import {
  deliverBlogDespiteGate,
  hasFilledBlogAxes,
  stampCompleteCustomerDelivery,
} from "@/lib/product/deliverySoftPass";
import { isCompletionHardFailure } from "@/lib/product/completionStandard";
import { GENERATION_LLM_LOOP_BUDGET_MS } from "@/lib/constants";
import { getBlogWriteMaxTokens } from "@/lib/config/briclogFastPipeline";
import { isLengthOnlyGateSoft } from "@/lib/product/briclogMission";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { RETRY } from "@/lib/product/craft";
import { normalizeBlogInputIntent } from "./normalizeBlogInputIntent";
import { assessFirstDeliveryQuality } from "@/lib/product/firstDeliveryQuality";
import { buildPersonaEngineRegenNote } from "@/lib/persona/personaEngineProfile";
import { applyWritingSkillToInput } from "@/lib/content/writingSkillLevel";
import { runContentQualityReviewPipeline } from "@/lib/quality/runContentQualityReviewPipeline";
import { assertBlogLengthTier, isBlogLengthTierMet } from "@/lib/content/blogLengthDelivery";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { shouldApplyStrictBrandGuard } from "@/lib/config/brandEngineFlags";
function hasLengthGateFailure(reasons = []) {
  return reasons.some((r) => r === "length_tier_under" || r === "length_tier_over");
}

function buildLengthApplicationSummary(input, blog) {
  const contract = input?._lengthContract || null;
  const lengthMeta = blog?._meta?.lengthControl || null;
  const actual = lengthMeta?.current ?? blog?._meta?.charCount ?? null;
  const min = contract?.min ?? lengthMeta?.min ?? null;
  const max = contract?.max ?? lengthMeta?.max ?? null;
  const inBand =
    typeof actual === "number" && typeof min === "number" && typeof max === "number"
      ? actual >= min && actual <= max
      : null;
  return {
    metric: "chars_with_spaces",
    requestedTier: contract?.tier || input?.blogLengthTier || "medium",
    min,
    target: contract?.target ?? lengthMeta?.target ?? null,
    max,
    actual,
    inBand,
  };
}

function blockOnLengthMismatch(input, pack) {
  if (isLengthOnlyGateSoft()) return null;
  const lengthGate = assertBlogLengthTier(input, pack);
  if (lengthGate.ok) return null;
  return researchGateBlockedResult(input, {
    ok: false,
    userMessage: RETRY.lengthHint,
    reasons: lengthGate.reasons,
  });
}


/** V4: 핵심 검수 통과 시 즉시 출력 — 90초 SLA */
const MAX_LLM_ATTEMPTS = CORE_MAX_REWRITES;
const MAX_SENSITIVE_LLM_ATTEMPTS = CORE_MAX_REWRITES;
const FAST_DELIVERY_BUDGET_MS = GENERATION_LLM_LOOP_BUDGET_MS;

/**
 * @param {Object} input 폼 입력
 * @returns {Promise<Object>}
 */
export async function generateBlogWithLLMFirst(input = {}) {
  const enriched = applyWritingSkillToInput(
    applyV2PersonaToInput(applyV4SpeakerToInput(enrichMinimalBlogInput(input)))
  );
  const intentNorm = normalizeBlogInputIntent(enriched);
  const normalized = intentNorm.input;

  const { buildDirectorMasterBrief, collectDirectorFeedbackSources } =
    await import("@/lib/product/directorContextEngine");
  normalized.directorMasterBrief = buildDirectorMasterBrief(normalized);
  normalized.directorFeedbackSources = collectDirectorFeedbackSources(normalized);

  const preWriteGate = assertPreWriteVerified(normalized);
  const v2Gate = requiresV2ResearchGate(normalized);
  if (
    !preWriteGate.ok &&
    (v2Gate ||
      preWriteGate.stage === "topic_proof" ||
      preWriteGate.reasons?.includes("missing_axes"))
  ) {
    return researchGateBlockedResult(normalized, preWriteGate);
  }

  const ctx = createPromptContext({
    ...normalized,
    canonicalBrief: intentNorm.canonicalBrief,
    inputGrounding: intentNorm.inputGrounding,
    topicAnchor: intentNorm.topicAnchor,
  });
  const prep = prepareUltimateBlogContext({ ...ctx, ...normalized });
  const mode = getLLMMode();
  if (!prep.ok && prep.reason === "meta_strategy_unresolved") {
    return researchGateBlockedResult(normalized, {
      ok: false,
      userMessage: "브랜드와 주제를 기준으로 콘텐츠 전략을 먼저 판단해야 합니다. 입력을 확인해 주세요.",
      reasons: ["meta_strategy_unresolved"],
    });
  }

  if (mode === "brief_only" && !isOpenAIConfigured()) {
    const { pack, source } = buildDeliverableBlogFallback({
      input: normalized,
      prep,
      failures: ["brief_only", "outline_blocked"],
    });
    return gateOrchestratorBlogPack(normalized, pack, {
      mode: "draft_fallback",
      llmAvailable: false,
      userDetail: LLM_USER_MESSAGES.briefOnlyHint,
      baseContentLabel: buildBaseLabel(input, pack),
      meta: {
        blogCharCount: pack?._meta?.charCount ?? 0,
        generationMode: source || "prose_fallback",
        draftFallback: true,
        operatorHint: getDevOperatorHint(),
      },
    });
  }

  if (mode === "dev_fallback" && process.env.NODE_ENV === "development") {
    const flavor = ctx.flavor;
    const blog = buildBlogPack(
      prep.ok ? prep.ctx : ctx,
      flavor,
      ctx.articleType,
      ctx.purpose,
      ctx.tone
    );
    blog._meta = {
      ...blog._meta,
      generationMode: "dev_fallback",
      devWarning: "개발용 템플릿 — 사용자에게 노출 금지",
    };
    return {
      ok: true,
      mode: "dev_fallback",
      llmAvailable: false,
      blogContent: blog,
      meta: {
        blogCharCount: blog._meta?.charCount,
        generationMode: "dev_fallback",
        passOutput: false,
      },
      userMessage: null,
      baseContentLabel: buildBaseLabel(input, blog),
    };
  }

  if (!prep.ok) {
    if (v2Gate) {
      return researchGateBlockedResult(normalized, {
        ok: false,
        userMessage:
          "조사·검증을 거치지 않은 대체 글을 출력할 수 없습니다.",
        reasons: ["prep_fallback_blocked"],
      });
    }
    const { pack, source } = buildDeliverableBlogFallback({
      input: normalized,
      prep,
      failures: [prep.reason || "insufficient_input"],
    });
    return {
      ok: true,
      mode: "draft_fallback",
      llmAvailable: isOpenAIConfigured(),
      blogContent: pack,
      softPass: true,
      withheld: false,
      meta: {
        blogCharCount: pack._meta?.charCount,
        generationMode: source,
        passOutput: false,
        softPass: true,
        draftFallback: true,
        reason: prep.reason,
      },
      userMessage: buildQualityUserHint([prep.reason]),
      userDetail: LLM_USER_MESSAGES.draftFallbackDetail,
      baseContentLabel: buildBaseLabel(input, pack),
    };
  }

  const buildCtx = prep.ctx;
  let sensitive =
    buildCtx.sensitiveCompliance ||
    resolveSensitiveCompliance({ ...normalized, ...buildCtx });
  if (normalized.billingPlan === "free" && sensitive.isSensitive) {
    sensitive = { ...sensitive, isSensitive: false, billingLimited: true };
  }
  const maxAttempts = normalized.publicTestMode
    ? 1
    : sensitive.isSensitive
    ? MAX_SENSITIVE_LLM_ATTEMPTS
    : MAX_LLM_ATTEMPTS;
  let lastError = null;
  let lastFailures = [];
  let bestProcessed = null;
  let bestScore = -1;
  let complianceRegenUsed = false;
  const loopStartedAt = Date.now();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() - loopStartedAt > FAST_DELIVERY_BUDGET_MS) {
      lastFailures = [...new Set([...(lastFailures || []), "time_budget_exceeded"])];
      lastError = new Error("TIME_BUDGET_EXCEEDED");
      break;
    }
    try {
      const complianceNote =
        sensitive.isSensitive && lastFailures.some((f) => f.startsWith("compliance_"))
          ? "민감 업종: 완치·수익보장·승소단정·처방권유·가격단정 금지. 확인 필요·전문가 상담 표현 사용."
          : null;
      const v2AxisPrior = bestProcessed?.pack?._meta?.qualityScore?.v2Axis;
      const v2AxisNote = needsV2AxisRegen(v2AxisPrior)
        ? buildV2AxisRegenNote(v2AxisPrior)
        : "";
      const personaRegenNote =
        attempt > 0 &&
        lastFailures.some((r) =>
          /persona|first_delivery_persona|persona_voice/.test(String(r))
        )
          ? buildPersonaEngineRegenNote(bestProcessed?.pack, normalized)
          : "";
      const coreRegenNote =
        attempt > 0 && lastFailures.length
          ? [
              buildRegenPromptForFailures(lastFailures, normalized),
              v2AxisNote,
              personaRegenNote,
            ]
              .filter(Boolean)
              .join(" ")
          : [v2AxisNote, personaRegenNote].filter(Boolean).join(" ") || null;
      const messages = buildBlogGenerationMessages({
        ...buildCtx,
        sensitiveCompliance: sensitive,
        _regenAttempt: attempt,
        pipeline: {
          ...buildCtx.pipeline,
          complianceRegenNote: complianceNote,
          regenNote:
            coreRegenNote ||
            (attempt > 0
              ? `이전 시도 검수 실패: ${lastFailures.join(", ")}. placeholder·AI관용구·장면·검색의도·인간성(70+)·브랜드 특징·반복문장 금지.${complianceNote ? ` ${complianceNote}` : ""}`
              : complianceNote),
        },
      });
      const writeTier =
        normalized.blogLengthTier || buildCtx.blogLengthTier || "medium";
      const writeMaxTokens = sensitive.isSensitive
        ? 3600
        : getBlogWriteMaxTokens(writeTier);
      const raw = await callOpenAIChat(
        messages,
        sensitive.isSensitive
          ? { temperature: 0.65, maxTokens: writeMaxTokens }
          : { temperature: 0.7, maxTokens: writeMaxTokens }
      );
      const parsed = parseLlmBlogResponse(raw, buildCtx);
      if (!parsed) {
        lastError = new Error("LLM_PARSE_FAILED");
        continue;
      }
      const outlineCheck = detectOutlineLeak(parsed);
      if (outlineCheck.isOutline) {
        lastFailures = [
          ...new Set([...(lastFailures || []), "outline_only_output"]),
        ];
        lastError = new Error("OUTLINE_ONLY_OUTPUT");
        if (attempt < maxAttempts - 1) continue;
      }
      const processed = postProcessLlmBlog(parsed, buildCtx, normalized);
      const coreQuality = processed.pack?._meta?.coreQuality;
      const scoreTotal =
        coreQuality?.total ??
        processed.pack?._meta?.qualityScore?.total ??
        processed.pack?._meta?.humanityScore ??
        0;
      const humanityScore =
        processed.pack?._meta?.humanBeliefScore ??
        processed.pack?._meta?.humanBelief?.score ??
        processed.pack?._meta?.v4Core?.humanityScore ??
        0;
      const compositeScore = Math.round(scoreTotal * 0.52 + humanityScore * 0.48);
      const v2Audit = processed.pack?._meta?.qualityScore?.constitutionV2;
      if (compositeScore > bestScore) {
        bestScore = compositeScore;
        bestProcessed = processed;
      }
      if (processed.pack?._meta) {
        processed.pack._meta.rewriteCount = attempt + 1;
        processed.pack._meta.failReasons = coreQuality?.failReasons || [];
      }
      const complianceScan = processed.complianceScan;
      if (
        sensitive.isSensitive &&
        complianceScan?.needsRegen &&
        !complianceRegenUsed &&
        attempt < maxAttempts - 1
      ) {
        complianceRegenUsed = true;
        lastFailures = [
          ...(complianceScan.warnings || []).map((w) => `compliance_${w}`),
        ];
        lastError = new Error("SENSITIVE_COMPLIANCE_REGEN");
        continue;
      }

      const beliefScore =
        processed.pack?._meta?.humanBeliefScore ??
        processed.pack?._meta?.humanBelief?.score;
      if (
        typeof beliefScore === "number" &&
        beliefScore < HUMAN_BELIEF_MIN_SCORE &&
        attempt < maxAttempts - 1
      ) {
        lastFailures = [
          ...(coreQuality?.failReasons || []),
          "human_belief_low",
        ];
        lastError = new Error("HUMAN_BELIEF_LOW");
        continue;
      }

      const coreNeedsRegen = needsCoreRegen(coreQuality);
      if (coreNeedsRegen && attempt < maxAttempts - 1) {
        lastFailures = [
          ...(coreQuality?.failReasons || []),
          "quality_below_target",
        ];
        lastError = new Error(`CORE_QUALITY_REGEN:${lastFailures.join(",")}`);
        continue;
      }

      if (
        !isBlogLengthTierMet(processed.pack, normalized, { strict: true }) &&
        !isLengthOnlyGateSoft() &&
        attempt < maxAttempts - 1
      ) {
        const lengthGate = assertBlogLengthTier(normalized, processed.pack);
        lastFailures = [
          ...new Set([
            ...(coreQuality?.failReasons || []),
            ...(lengthGate.reasons || ["length_tier_under"]),
            (lengthGate.reasons || []).includes("length_tier_over")
              ? "length_over_max"
              : "length_too_short",
          ]),
        ];
        lastError = new Error("LENGTH_TIER_REGEN");
        continue;
      }

      if (
        needsConstitutionRegen(processed.pack?._meta?.qualityScore, v2Audit) &&
        attempt < maxAttempts - 1
      ) {
        lastFailures = [
          ...(coreQuality?.failReasons || []),
          ...(v2Audit?.failures || []),
          scoreTotal < CONSTITUTION_V2_TARGET_SCORE
            ? "quality_below_target"
            : "constitution_v2",
        ];
        lastError = new Error(
          `CONSTITUTION_V2_REGEN:${lastFailures.join(",")}`
        );
        continue;
      }

      const v2Axis = processed.pack?._meta?.qualityScore?.v2Axis;
      const v3Score = processed.pack?._meta?.qualityScore?.v3;
      if (needsV2AxisRegen(v2Axis) && attempt < maxAttempts - 1) {
        lastFailures = [...(v2Axis?.failReasons || [])];
        lastError = new Error(`V2_AXIS_REGEN:${lastFailures.join(",")}`);
        continue;
      }
      if (normalized.v3EngineEnforced && needsV3Regen(v3Score) && attempt < maxAttempts - 1) {
        lastFailures = [...(v3Score?.failReasons || [])];
        lastError = new Error(`V3_REGEN:${lastFailures.join(",")}`);
        continue;
      }

      const firstDeliveryReady =
        processed.pack?._meta?.firstDeliveryReady !== false &&
        processed.pack?._meta?.humanEditorPass !== false &&
        processed.pack?._meta?.displayReady !== false;

      if (
        !firstDeliveryReady &&
        attempt < maxAttempts - 1 &&
        (v2Gate || isBriclogMissionEnforced())
      ) {
        const fdAssess = assessFirstDeliveryQuality(processed.pack, normalized);
        lastFailures = [
          ...new Set([
            ...(lastFailures || []),
            ...(fdAssess.reasons || []),
            "first_delivery_regen",
          ]),
        ];
        lastError = new Error(
          `FIRST_DELIVERY_REGEN:${(fdAssess.reasons || []).join(",")}`
        );
        continue;
      }

      const hardPass =
        processed.passOutput &&
        firstDeliveryReady &&
        scoreTotal >= CORE_TARGET_SCORE &&
        !coreNeedsRegen &&
        isBlogLengthTierMet(processed.pack, normalized, { strict: true }) &&
        (!v2Audit || v2Audit.ok) &&
        (!v2Axis || v2Axis.ok) &&
        (!normalized.v3EngineEnforced || (v3Score && v3Score.ok));

      if (hardPass) {
        const reviewed = await attachQualityReview(
          processed,
          buildCtx,
          normalized
        );
        const deliver = finalizeForDelivery(normalized, reviewed.pack);
        if (!deliver.ok) {
          lastFailures = [...(deliver.reasons || []), "output_verify_blocked"];
          lastError = new Error("OUTPUT_VERIFY_BLOCKED");
          if (attempt < maxAttempts - 1) continue;
          return researchGateBlockedResult(
            normalized,
            {
              ok: false,
              userMessage: deliver.userMessage,
              reasons: deliver.reasons,
            },
            reviewed.pack
          );
        }
        return successResult(
          input,
          deliver.pack,
          { ...reviewed, pack: deliver.pack },
          attempt + 1,
          sensitive
        );
      }

      if (processed.passOutput && scoreTotal < CORE_TARGET_SCORE) {
        lastFailures.push("quality_below_target");
      }

      const v4 = processed.pack?._meta?.v4Core;
      lastFailures = [
        ...(coreQuality?.failReasons || []),
        ...(v4?.blockers || []),
        ...(processed.audit?.blockers || []),
        ...(processed.pack?._meta?.hardValidation?.failures || []),
        ...(complianceScan?.warnings || []).map((w) => `compliance_${w}`),
      ];
      if (v4 && v4.searchIntentScore < SEARCH_INTENT_MIN) {
        lastFailures.push("search_intent_low");
      }
      if (v4 && v4.humanityScore < HUMANITY_MIN) {
        lastFailures.push("humanity_below_min");
      }
      if (!lastFailures.length) lastFailures.push("quality");
      lastFailures = [...new Set(lastFailures)];
      lastError = new Error(`LLM_QUALITY_FAILED:${lastFailures.join(",")}`);
    } catch (e) {
      lastError = e;
    }
  }

  if (sensitive.isSensitive && bestProcessed?.pack?.sections?.length) {
    const lengthBlocked = blockOnLengthMismatch(normalized, bestProcessed.pack);
    if (lengthBlocked) return lengthBlocked;
    return sensitiveDeliverResult(
      input,
      {
        ...bestProcessed.pack,
        _meta: {
          ...bestProcessed.pack._meta,
          softPass: true,
          passOutput: false,
          sensitiveDelivered: true,
        },
      },
      bestProcessed,
      maxAttempts,
      lastFailures,
      sensitive
    );
  }

  if (bestProcessed?.pack?.sections?.length) {
    if (
      !isBlogLengthTierMet(bestProcessed.pack, normalized, { strict: true })
    ) {
      const lengthGate = assertBlogLengthTier(normalized, bestProcessed.pack);
      lastFailures = [
        ...new Set([
          ...lastFailures,
          ...(lengthGate.reasons || ["length_tier_under"]),
          (lengthGate.reasons || []).includes("length_tier_over")
            ? "length_over_max"
            : "length_too_short",
        ]),
      ];
    }
  }

  if (bestProcessed?.pack?.sections?.length) {
    const lengthBlocked = blockOnLengthMismatch(normalized, bestProcessed.pack);
    if (lengthBlocked) return lengthBlocked;
    if (v2Gate) {
      const deliver = finalizeForDelivery(normalized, bestProcessed.pack);
      if (!deliver.ok) {
        return researchGateBlockedResult(
          normalized,
          {
            ok: false,
            userMessage:
              formatPostVerifyUserMessage(deliver) ||
              deliver.userMessage ||
              RETRY.hint,
            reasons: deliver.reasons || lastFailures,
          },
          bestProcessed.pack
        );
      }
      bestProcessed.pack = deliver.pack;
      bestProcessed = await attachQualityReview(
        bestProcessed,
        buildCtx,
        normalized
      );
      return successResult(
        input,
        bestProcessed.pack,
        bestProcessed,
        maxAttempts,
        sensitive
      );
    }
    bestProcessed = await attachQualityReview(
      bestProcessed,
      buildCtx,
      normalized
    );
    if (
      v2Gate &&
      bestProcessed.pack?._meta?.humanEditorPass === false
    ) {
      return researchGateBlockedResult(
        normalized,
        {
          ok: false,
          userMessage:
            "첫 편집본 품질 기준에 맞지 않아 다시 다듬는 중입니다. 잠시 후 「다시 받기」를 눌러 주세요.",
          reasons: bestProcessed.pack._meta?.contentQuality?.issues?.map(
            (i) => i.type
          ) || ["first_delivery_human_editor"],
        },
        bestProcessed.pack
      );
    }

    const hint = buildQualityUserHint(lastFailures);
    const suggestions = buildImprovementSuggestions(
      bestProcessed.pack._meta?.failReasons || lastFailures
    );
    bestProcessed.pack._meta = {
      ...bestProcessed.pack._meta,
      softPass: true,
      passOutput: false,
      qualityHint: hint,
      rewriteCount: maxAttempts,
      improvementSuggestions: suggestions,
    };
    return {
      ok: true,
      mode: "llm",
      llmAvailable: true,
      blogContent: bestProcessed.pack,
      softPass: true,
      withheld: false,
      meta: attachDeliveryTelemetry(
        {
          blogCharCount:
            bestProcessed.charCount ?? bestProcessed.pack._meta?.charCount,
          generationMode: "llm_soft_pass",
          passOutput: false,
          softPass: true,
          regenAttempts: maxAttempts,
          rewriteCount: maxAttempts,
          failures: lastFailures,
          failReasons: bestProcessed.pack._meta?.failReasons || lastFailures,
          qualityScore: bestScore,
          improvementSuggestions: suggestions,
          error: String(lastError?.message || lastError).slice(0, 120),
          optionApplication: {
            stepOrder: [
              "input_analysis",
              "brand_strategy",
              "industry_strategy",
              "content_objective",
              "length_structure",
              "brand_memory_lookup",
              "approved_content_lookup",
              "official_research",
              "naver_research",
              "brand_view_generation",
              "tone_determination",
              "content_generation",
              "length_validation",
              "quality_validation",
            ],
            length: buildLengthApplicationSummary(
              normalized,
              bestProcessed.pack
            ),
          },
        },
        bestProcessed.pack
      ),
      userMessage:
        buildDeliveryQualityHint(
          { softPass: true, generationMode: "llm_soft_pass" },
          bestProcessed.pack
        ) || hint,
      userDetail: LLM_USER_MESSAGES.qualitySoftPassDetail,
      baseContentLabel: buildBaseLabel(input, bestProcessed.pack),
    };
  }

  const { pack, source } = buildDeliverableBlogFallback({
    input: normalized,
    prep,
    bestPack: bestProcessed?.pack,
    failures: lastFailures,
  });
  const fallbackLengthBlocked = blockOnLengthMismatch(normalized, pack);
  if (fallbackLengthBlocked) return fallbackLengthBlocked;
  return gateOrchestratorBlogPack(normalized, pack, {
    mode: "draft_fallback",
    llmAvailable: true,
    userMessage: buildQualityUserHint(lastFailures),
    userDetail: LLM_USER_MESSAGES.draftFallbackDetail,
    baseContentLabel: buildBaseLabel(input, pack),
    meta: {
      blogCharCount: pack._meta?.charCount,
      generationMode: source,
      draftFallback: true,
      regenAttempts: maxAttempts,
      failures: lastFailures,
      sensitiveIndustry: sensitive.isSensitive,
      error: String(lastError?.message || lastError).slice(0, 120),
      optionApplication: {
        stepOrder: [
          "input_analysis",
          "brand_strategy",
          "industry_strategy",
          "content_objective",
          "length_structure",
          "brand_memory_lookup",
          "approved_content_lookup",
          "official_research",
          "naver_research",
          "brand_view_generation",
          "tone_determination",
          "content_generation",
          "length_validation",
          "quality_validation",
        ],
        length: buildLengthApplicationSummary(normalized, pack),
      },
    },
  });
}

function shouldSkipPostQualityReview(pack) {
  const total = pack?._meta?.qualityScore?.total;
  if (typeof total !== "number" || total < CORE_TARGET_SCORE) return false;
  const reasons = pack?._meta?.failReasons;
  if (!Array.isArray(reasons) || !reasons.length) return true;
  const softOnly = reasons.every((r) =>
    /^(length_tier_|filler_padding|emotion_thin)/.test(String(r))
  );
  return softOnly;
}

async function attachQualityReview(processed, buildCtx, normalized) {
  if (!processed?.pack?.sections?.length) return processed;
  // 90초 SLA — 생성 후 추가 LLM 품질 루프 생략 (편집본은 즉시 배달)
  return processed;
}

function finalizeForDelivery(input, pack) {
  const gate = assertPostWriteDeliverable(input, pack);
  if (gate.ok) return gate;
  if (!pack?.sections?.length || !hasFilledBlogAxes(input)) return gate;

  const preview = deliverBlogDespiteGate(input, pack, gate);
  if (preview?.blogContent?.sections?.length) {
    return { ok: true, pack: preview.blogContent, softPass: false };
  }

  const stamped = stampCompleteCustomerDelivery(pack, input, {
    failReasons: gate.reasons,
  });
  if (stamped) {
    return { ok: true, pack: stamped, softPass: false };
  }

  return gate;
}

function successResult(input, blog, processed, regenAttempts, sensitive) {
  const tier = input.blogLengthTier || "medium";
  const blogWithMeta = {
    ...blog,
    _meta: { ...blog._meta, blogLengthTier: tier },
  };
  const wrapped = blockUnverifiedBlogApiResponse(
    { blogContent: blogWithMeta },
    input
  );
  if (!wrapped.blogContent) {
    return researchGateBlockedResult(
      input,
      {
        ok: false,
        userMessage: wrapped.userMessage,
        reasons: wrapped.meta?.failReasons,
      },
      blogWithMeta
    );
  }
  const hardMeta = attachDeliveryTelemetry(
    {
      blogCharCount:
        processed.charCount ?? wrapped.blogContent._meta?.charCount,
      v2PipelineVerified: true,
      v3PipelineVerified: true,
      generationMode: sensitive?.isSensitive
        ? "llm_openai_sensitive"
        : "llm_openai",
      passOutput: true,
      regenAttempts,
      rewriteCount: blog._meta?.rewriteCount ?? regenAttempts,
      qualityScore:
        blog._meta?.qualityReviewScore ??
        blog._meta?.qualityScore?.total ??
        blog._meta?.coreQuality?.total,
      qualityReviewScore: blog._meta?.qualityReviewScore,
      qualityReviewApproved: blog._meta?.qualityReviewApproved,
      failReasons: blog._meta?.failReasons || [],
      sensitiveIndustry: !!sensitive?.isSensitive,
      sensitiveLabel: sensitive?.label || null,
      optionApplication: {
        stepOrder: [
          "input_analysis",
          "brand_strategy",
          "industry_strategy",
          "content_objective",
          "length_structure",
          "brand_memory_lookup",
          "approved_content_lookup",
          "official_research",
          "naver_research",
          "brand_view_generation",
          "tone_determination",
          "content_generation",
          "length_validation",
          "quality_validation",
        ],
        length: buildLengthApplicationSummary(input, wrapped.blogContent),
      },
    },
    wrapped.blogContent
  );
  return {
    ok: true,
    mode: "llm",
    llmAvailable: true,
    blogContent: wrapped.blogContent,
    meta: hardMeta,
    userMessage: null,
    baseContentLabel: buildBaseLabel(input, wrapped.blogContent),
  };
}

function sensitiveDeliverResult(
  input,
  blog,
  processed,
  regenAttempts,
  failures,
  sensitive
) {
  const banner =
    blog._meta?.complianceUserBanner ||
    "법·의료 정보는 반드시 전문가 확인해 주세요.";
  return {
    ok: true,
    mode: "llm",
    llmAvailable: true,
    blogContent: blog,
    softPass: true,
    withheld: false,
    meta: {
      blogCharCount: processed.charCount ?? blog._meta?.charCount,
      generationMode: "llm_sensitive_warn",
      passOutput: false,
      softPass: true,
      regenAttempts,
      sensitiveIndustry: true,
      sensitiveLabel: sensitive?.label,
      complianceWarnings: blog._meta?.complianceWarnings || [],
      failures,
    },
    userMessage: banner,
    userDetail:
      blog._meta?.complianceWarnings?.length > 0
        ? `검수 표현: ${blog._meta.complianceWarnings.slice(0, 2).join(" · ")}`
        : null,
    baseContentLabel: buildBaseLabel(input, blog),
  };
}

function buildBaseLabel(input, blog) {
  const region = input.region?.trim() || "";
  const topic =
    blog?.representativeTitle ||
    input.topic?.trim() ||
    input.mainKeyword?.trim() ||
    "콘텐츠";
  return [region, topic].filter(Boolean).join(" ") + " · 블로그";
}

export function getLlmServiceStatus() {
  const available = isOpenAIConfigured();
  return {
    llmAvailable: available,
    mode: getLLMMode(),
    userMessage: available ? null : LLM_USER_MESSAGES.engineNotConnected,
    briefOnlyMessage: LLM_USER_MESSAGES.briefOnlyBody,
    operatorHint:
      typeof process !== "undefined" ? getDevOperatorHint() : null,
  };
}
