/**
 * LLM First — 브랜드 컨텍스트 엔진 + OpenAI GPT 문장 생성
 *
 * 흐름: 입력 → 브랜드 분석 → 조사 → 프로파일 → 구조 → OpenAI → 검수 → 출력
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
import { normalizeBlogInputIntent } from "./normalizeBlogInputIntent";
import { runContentQualityReviewPipeline } from "@/lib/quality/runContentQualityReviewPipeline";

/** V4: 핵심 검수 통과 시 즉시 출력 */
const MAX_LLM_ATTEMPTS = CORE_MAX_REWRITES;
const MAX_SENSITIVE_LLM_ATTEMPTS = CORE_MAX_REWRITES;

/**
 * @param {Object} input 폼 입력
 * @returns {Promise<Object>}
 */
export async function generateBlogWithLLMFirst(input = {}) {
  const enriched = applyV2PersonaToInput(
    applyV4SpeakerToInput(enrichMinimalBlogInput(input))
  );
  const intentNorm = normalizeBlogInputIntent(enriched);
  const normalized = intentNorm.input;

  const preWriteGate = assertPreWriteVerified(normalized);
  if (!preWriteGate.ok) {
    return researchGateBlockedResult(normalized, preWriteGate);
  }
  const v2Gate = requiresV2ResearchGate(normalized);

  const ctx = createPromptContext({
    ...normalized,
    canonicalBrief: intentNorm.canonicalBrief,
    inputGrounding: intentNorm.inputGrounding,
    topicAnchor: intentNorm.topicAnchor,
  });
  const prep = prepareUltimateBlogContext({ ...ctx, ...normalized });
  const mode = getLLMMode();

  if (mode === "brief_only") {
    if (v2Gate) {
      return researchGateBlockedResult(normalized, {
        ok: false,
        userMessage:
          "조사·검증 없이 구성안만 출력할 수 없습니다. AI 연결 후 조사·검증·작성 순서로 생성해 주세요.",
        reasons: ["brief_only_blocked"],
      });
    }
    const brief = buildContentBriefPack(input, prep);
    return {
      ok: true,
      mode: "brief_only",
      llmAvailable: false,
      blogContent: brief,
      meta: {
        blogCharCount: brief._meta?.charCount ?? 0,
        generationMode: "brief_only",
        templateBlocked: true,
        operatorHint: getDevOperatorHint(),
      },
      userMessage: LLM_USER_MESSAGES.engineNotConnected,
      userDetail: LLM_USER_MESSAGES.briefOnlyBody,
      baseContentLabel: buildBaseLabel(input, brief),
    };
  }

  if (mode === "dev_fallback" && process.env.NODE_ENV === "development") {
    if (v2Gate) {
      return researchGateBlockedResult(normalized, {
        ok: false,
        userMessage: "조사·검증 없이 템플릿 글을 출력할 수 없습니다.",
        reasons: ["dev_fallback_blocked"],
      });
    }
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
  const maxAttempts = sensitive.isSensitive
    ? MAX_SENSITIVE_LLM_ATTEMPTS
    : MAX_LLM_ATTEMPTS;
  let lastError = null;
  let lastFailures = [];
  let bestProcessed = null;
  let bestScore = -1;
  let complianceRegenUsed = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const complianceNote =
        sensitive.isSensitive && lastFailures.some((f) => f.startsWith("compliance_"))
          ? "민감 업종: 완치·수익보장·승소단정·처방권유·가격단정 금지. 확인 필요·전문가 상담 표현 사용."
          : null;
      const v2AxisPrior = bestProcessed?.pack?._meta?.qualityScore?.v2Axis;
      const v2AxisNote = needsV2AxisRegen(v2AxisPrior)
        ? buildV2AxisRegenNote(v2AxisPrior)
        : "";
      const coreRegenNote =
        attempt > 0 && lastFailures.length
          ? [buildRegenPromptForFailures(lastFailures, normalized), v2AxisNote]
              .filter(Boolean)
              .join(" ")
          : v2AxisNote || null;
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
      const raw = await callOpenAIChat(
        messages,
        sensitive.isSensitive
          ? { temperature: 0.65, maxTokens: 5000 }
          : undefined
      );
      const parsed = parseLlmBlogResponse(raw, buildCtx);
      if (!parsed) {
        lastError = new Error("LLM_PARSE_FAILED");
        continue;
      }
      const processed = postProcessLlmBlog(parsed, buildCtx, normalized);
      const coreQuality = processed.pack?._meta?.coreQuality;
      const scoreTotal =
        coreQuality?.total ??
        processed.pack?._meta?.qualityScore?.total ??
        processed.pack?._meta?.humanityScore ??
        0;
      const v2Audit = processed.pack?._meta?.qualityScore?.constitutionV2;
      if (scoreTotal > bestScore) {
        bestScore = scoreTotal;
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

      const coreNeedsRegen = needsCoreRegen(coreQuality);
      if (coreNeedsRegen && attempt < maxAttempts - 1) {
        lastFailures = [...(coreQuality?.failReasons || [])];
        lastError = new Error(`CORE_QUALITY_REGEN:${lastFailures.join(",")}`);
        continue;
      }

      if (
        needsConstitutionRegen(processed.pack?._meta?.qualityScore, v2Audit) &&
        attempt < maxAttempts - 1
      ) {
        lastFailures = [
          ...(coreQuality?.failReasons || []),
          ...(v2Audit?.failures || []),
          scoreTotal < CONSTITUTION_V2_TARGET_SCORE ? "quality_below_90" : "constitution_v2",
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

      const hardPass =
        processed.passOutput &&
        scoreTotal >= CORE_TARGET_SCORE &&
        !coreNeedsRegen &&
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
          return researchGateBlockedResult(normalized, {
            ok: false,
            userMessage: deliver.userMessage,
            reasons: deliver.reasons,
          });
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
        lastFailures.push("quality_below_90");
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
    if (v2Gate) {
      const deliver = finalizeForDelivery(normalized, bestProcessed.pack);
      if (deliver.ok) {
        bestProcessed.pack = deliver.pack;
      } else {
        return researchGateBlockedResult(normalized, {
          ok: false,
          userMessage: deliver.userMessage,
          reasons: deliver.reasons || lastFailures,
        });
      }
    }
    bestProcessed = await attachQualityReview(
      bestProcessed,
      buildCtx,
      normalized
    );
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
      meta: {
        blogCharCount: bestProcessed.charCount ?? bestProcessed.pack._meta?.charCount,
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
      },
      userMessage: hint,
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
  const hint = buildQualityUserHint(lastFailures);
  return {
    ok: true,
    mode: "draft_fallback",
    llmAvailable: true,
    blogContent: pack,
    softPass: true,
    withheld: false,
    meta: {
      blogCharCount: pack._meta?.charCount,
      generationMode: source,
      passOutput: false,
      softPass: true,
      draftFallback: true,
      regenAttempts: maxAttempts,
      failures: lastFailures,
      sensitiveIndustry: sensitive.isSensitive,
      error: String(lastError?.message || lastError).slice(0, 120),
    },
    userMessage: hint,
    userDetail: LLM_USER_MESSAGES.draftFallbackDetail,
    baseContentLabel: buildBaseLabel(input, pack),
  };
}

async function attachQualityReview(processed, buildCtx, normalized) {
  if (!processed?.pack?.sections?.length) return processed;
  try {
    const { pack, review, revisionCount } =
      await runContentQualityReviewPipeline(processed.pack, buildCtx, {
        input: normalized,
      });
    processed.pack = pack;
    processed.qualityReview = review;
    if (pack._meta && revisionCount > 0) {
      pack._meta.rewriteCount =
        (pack._meta.rewriteCount || 0) + revisionCount;
    }
  } catch {
    /* 검수 실패 시 원본 유지 */
  }
  return processed;
}

function finalizeForDelivery(input, pack) {
  return assertPostWriteDeliverable(input, pack);
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
    return researchGateBlockedResult(input, {
      ok: false,
      userMessage: wrapped.userMessage,
      reasons: wrapped.meta?.failReasons,
    });
  }
  return {
    ok: true,
    mode: "llm",
    llmAvailable: true,
    blogContent: wrapped.blogContent,
    meta: {
      blogCharCount: processed.charCount ?? wrapped.blogContent._meta?.charCount,
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
    },
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
