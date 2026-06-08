/**
 * V2 파이프라인: 조사 → 검증 → 작성 → 검증
 * 조사·검증 없이 작성된 글은 품질 점수와 무관하게 출력 금지.
 */
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { runV3PostWritePipeline } from "@/lib/content/v3/pipeline";
import { V3_TARGET_SCORE } from "@/lib/content/v3/constants";
import { isChannelPackDeliverable } from "@/lib/content/channelPack";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  applyEditorPreOutputCorrection,
  assertEditorPreOutput,
} from "@/lib/content/editorPreOutputGate";
import { shouldApplyStrictBrandGuard } from "@/lib/config/brandEngineFlags";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { assertV17PreOutput } from "@/lib/content/v17ContentGate";
import {
  assertKnowledgeExpansionReady,
  detectTopicPaddingViolations,
  KNOWLEDGE_EXPANSION_STAGES,
} from "@/lib/content/knowledgeExpansionEngine";
import {
  requiresBetaTestGuard,
  assertBetaTestGuardWithCorrection,
  BETA_GUARD_USER_MESSAGE,
  shouldWithholdFailedPostVerify,
} from "@/lib/content/betaTestGuardEngine";
import { RETRY } from "@/lib/product/craft";
import {
  formatPostVerifyUserMessage,
  resolveDeliveryFailureMessage,
} from "@/lib/product/customerOutput";
import {
  collectGateReasons,
  deliverBlogDespiteGate,
  hasFilledBlogAxes,
  isHardWithholdFailure,
  isSoftInformationGateFailure,
  SOFT_INFORMATION_REASONS,
  stampCompleteCustomerDelivery,
} from "@/lib/product/deliverySoftPass";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { salvageBlogPackForDelivery } from "@/lib/generation/postVerifySalvage";
import { attachContentQualityToApiMeta } from "@/lib/product/contentQualityDelivery";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { assessResearchSufficiencyForWrite } from "@/lib/content/researchSufficiencyGate";
import { assertPreWriteContentQuality } from "@/lib/product/contentQualityEngine";
import { assertFirstDeliveryQuality } from "@/lib/product/firstDeliveryQuality";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { assertCompleteBlogPackForDelivery } from "@/lib/product/completeDeliveryGate";
import {
  hasCompletedResearchStep,
  sanitizeCustomerResearchMessage,
} from "@/lib/product/researchReadiness";
import { assertPrimaryDirectivePreWrite } from "@/lib/product/coreContentEngine";
import { assessResearchDepth } from "@/lib/evolution/researchDepthEngine";
import { assertResearchVerificationGate } from "@/lib/evolution/researchVerificationGate";
import { PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority";
import { assertContextLockPreWrite } from "@/lib/content/contextLockEngine";
import { assertTopicProofPreWrite, assertTopicProofPostWrite } from "@/lib/product/topicProofGate";
import { assertNextEvolutionPreWrite } from "@/lib/product/briclogNextEvolutionDirective";
import { isNextEvolutionDirectiveEnforced } from "@/lib/product/missionFlags";
import { evaluateBrandJournalistWriteGate } from "@/lib/product/brandJournalistDirective";
import {
  assertTopicLockPostWrite,
  assertTopicLockPreWrite,
  sanitizeTopicLockViolations,
} from "@/lib/product/topicLockEngine";
import { assertTopicAnswerPostWrite } from "@/lib/product/topicAnswerEngine";
import { isTopicLockEnforced, isTopicAnswerEnforced } from "@/lib/product/missionFlags";

export const V2_PIPELINE_ORDER = [
  "topic_map",
  "info_securement_rate",
  "topic_explanation_rate",
  "info_unit_check",
  "topic_decompose",
  "information_research",
  "information_expand",
  "editor_write",
  "quality_audit",
  "brand_uniqueness",
  "output",
];

/** @deprecated use KNOWLEDGE_EXPANSION_STAGES */
export const V2_LEGACY_PIPELINE_ORDER = [
  "research",
  "research_verify",
  "write",
  "output_verify",
];

const MESSAGES = {
  missing_axes:
    "브랜드 · 지역 · 주제를 모두 입력해 주세요.",
  pre_write:
    "조사·검증 단계를 마무리하지 못했습니다. 브랜드·지역·주제를 확인해 주세요.",
  post_write:
    "작성 후 검수 기준에 맞지 않아 화면에 올리지 않았습니다.",
  no_research_output:
    "조사·검증 없이 작성된 글은 출력할 수 없습니다.",
};

export function requiresV2ResearchGate(input = {}) {
  if (input.v2AxisRequired === false) return false;
  if (input.channelDeriveExempt === true) return false;
  return (
    input.v2AxisRequired === true ||
    input.v2PipelineEnforced === true ||
    input.v3EngineEnforced === true
  );
}

export function assertPreWriteVerified(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const hasAxes = Boolean(brand && region && topic);

  let topicProof = null;
  if (hasAxes && isBriclogMissionEnforced()) {
    topicProof = assertTopicProofPreWrite(input);
    if (topicProof.topicMap) {
      input.topicMap = topicProof.topicMap;
      input.topicMapBrief = topicProof.topicMapBrief;
    }
    if (!topicProof.ok && !input.publicTestMode) {
      const topicProofBypass =
        hasCompletedResearchStep(input) ||
        input.researchThinMode === true ||
        (hasFilledBlogAxes(input) &&
          ((input.researchFacts?.length ?? 0) >= 1 ||
            (input.researchFactCount ?? 0) >= 1));
      if (!topicProofBypass) {
        return {
          ok: false,
          stage: "topic_proof",
          reasons: topicProof.reasons,
          userMessage: sanitizeCustomerResearchMessage(
            topicProof.userMessage,
            input,
            topicProof.reasons
          ),
          topicProof,
          pipelineOrder: topicProof.metrics?.pipelineOrder,
          pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
        };
      }
    }
  }

  if (!requiresV2ResearchGate(input)) {
    return {
      ok: true,
      stage: "research_verify",
      skipped: true,
      topicProofOk: topicProof?.ok ?? true,
    };
  }

  const reasons = [];
  if (!hasAxes) reasons.push("missing_axes");

  if (reasons.length) {
    return {
      ok: false,
      stage: "information_research",
      reasons,
      userMessage: userMessageForPreWrite(reasons),
    };
  }

  const contextLock = assertContextLockPreWrite(input);
  if (!contextLock.ok) {
    return {
      ok: false,
      stage: "context_lock",
      reasons: contextLock.reasons,
      userMessage:
        contextLock.userMessage ||
        "업종·브랜드·주제를 확정한 뒤 글을 작성합니다.",
      contextLock: contextLock.lock,
      pipelineOrder: PIPELINE_ORDER_STRICT,
    };
  }
  if (contextLock.lock) {
    input.contextLock = contextLock.lock;
  }

  if (isTopicLockEnforced()) {
    const topicLockGate = assertTopicLockPreWrite(input);
    if (!topicLockGate.ok && !topicLockGate.skipped) {
      return {
        ok: false,
        stage: "topic_lock",
        reasons: topicLockGate.reasons,
        userMessage: sanitizeCustomerResearchMessage(
          topicLockGate.userMessage,
          input,
          topicLockGate.reasons
        ),
        topicLock: topicLockGate.lock,
        pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
      };
    }
    if (topicLockGate.lock) {
      input.topicLock = topicLockGate.lock;
    }
  }

  const clientAxisVerified = Boolean(
    input.v2ResearchReady &&
      input.v2PreWriteVerified &&
      (input.v2PipelineStage === "information_research_verified" ||
        input.v2AxisVerified)
  );
  if (clientAxisVerified) {
    return {
      ok: true,
      stage: "research_verify",
      clientVerified: true,
      factCount:
        input.researchFactCount ?? input.researchFacts?.length ?? 0,
      topicProofOk: topicProof?.ok ?? true,
      topicProofSoft: topicProof?.ok === false,
      pipelineOrder: PIPELINE_ORDER_STRICT,
      pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
    };
  }

  if (isBriclogMissionEnforced()) {
    const primary = assertPrimaryDirectivePreWrite(input);
    if (!primary.ok) {
      return {
        ok: false,
        stage: "information_research",
        reasons: primary.reasons,
        userMessage: sanitizeCustomerResearchMessage(
          primary.userMessage,
          input,
          primary.reasons
        ),
        primaryDirective: primary,
        pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
      };
    }

    const researchDepth = assessResearchDepth(input);
    if (researchDepth.blocked) {
      return {
        ok: false,
        stage: "research_verify",
        reasons: ["research_depth_insufficient"],
        userMessage: sanitizeCustomerResearchMessage(
          "조사 정보가 부족합니다. 추가 조사 후 글을 작성합니다.",
          input,
          ["research_depth_insufficient"]
        ),
        researchDepth,
        pipelineOrder: PIPELINE_ORDER_STRICT,
        pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
      };
    }

    const researchVerify = assertResearchVerificationGate(input);
    if (!researchVerify.ok) {
      return {
        ok: false,
        stage: "research_verify",
        reasons: researchVerify.reasons,
        userMessage: sanitizeCustomerResearchMessage(
          researchVerify.userMessage,
          input,
          researchVerify.reasons
        ),
        preGenerationMetrics: researchVerify.metrics,
        pipelineOrder: researchVerify.pipelineOrder,
        pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
      };
    }

    if (isNextEvolutionDirectiveEnforced()) {
      const evolution = assertNextEvolutionPreWrite(input);
      if (!evolution.ok) {
        return {
          ok: false,
          stage: evolution.stage || "next_evolution_blocked",
          reasons: evolution.reasons,
          userMessage: sanitizeCustomerResearchMessage(
            evolution.userMessage,
            input,
            evolution.reasons
          ),
          nextEvolution: evolution,
          pipelineOrder: PIPELINE_ORDER_STRICT,
          pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
        };
      }
      Object.assign(input, {
        brandInvestigationReport: evolution.investigation,
        brandInvestigationBrief: evolution.brandInvestigationBrief,
        contentDesignBrief: evolution.contentDesignBrief,
        brandKnowledgeBrief: evolution.brandKnowledgeBrief,
        nextEvolutionPreWrite: evolution,
      });
    } else {
      const brandJournalist = evaluateBrandJournalistWriteGate(input);
      if (!brandJournalist.ok) {
        return {
          ok: false,
          stage: "brand_investigation",
          reasons: brandJournalist.reasons,
          userMessage: sanitizeCustomerResearchMessage(
            brandJournalist.userMessage,
            input,
            brandJournalist.reasons
          ),
          brandInvestigation: brandJournalist,
          pipelineOrder: PIPELINE_ORDER_STRICT,
          pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
        };
      }
      if (brandJournalist.investigationReport) {
        input.brandInvestigationReport = brandJournalist;
        input.brandInvestigationBrief = brandJournalist.investigationReport;
      }
    }

    const contentReady = assertPreWriteContentQuality(input);
    if (!contentReady.ok) {
      return {
        ok: false,
        stage: contentReady.stage || "information_research",
        reasons: contentReady.reasons,
        userMessage: sanitizeCustomerResearchMessage(
          contentReady.userMessage,
          input,
          contentReady.reasons
        ),
        factCount: contentReady.research?.factCount,
        expansionReady: contentReady.expansion,
        supplemental: contentReady.supplemental,
        pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
      };
    }
    return {
      ok: true,
      stage: "research_verify",
      factCount:
        contentReady.research?.factCount ??
        input.researchFactCount ??
        input.researchFacts?.length ??
        0,
      expansionReady: contentReady.expansion,
      unitCount: contentReady.unitCount,
      preGenerationMetrics: researchVerify.metrics,
      pipelineOrder: PIPELINE_ORDER_STRICT,
      pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
    };
  }

  const clientResearchDone = Boolean(
    input.knowledgeExpansionReady ||
      input.v2ResearchReady ||
      input.v2AxisVerified ||
      input.v2PreWriteVerified
  );

  const expansionReady = clientResearchDone
    ? { ok: true, skipped: true, clientVerified: true }
    : assertKnowledgeExpansionReady(
      {
        brand,
        region,
        topicRaw: topic,
        unitCount: input.informationUnits?.unitCount,
        coverageCount: input.knowledgeCoverage?.coverageCount,
        searchQueryCount: input.searchExpansion?.searchQueries?.length,
        informationUnits: input.informationUnits,
        knowledgeCoverage: input.knowledgeCoverage,
        searchExpansion: input.searchExpansion,
      },
      input
    );

  if (!expansionReady.ok) {
    return {
      ok: false,
      stage: "topic_decompose",
      reasons: ["knowledge_expansion_not_ready", ...(expansionReady.reasons || [])],
      userMessage:
        expansionReady.userMessage ||
        "주제 분해·정보 조사를 완료하지 못했습니다. 입력을 확인한 뒤 다시 시도해 주세요.",
      expansionReady,
    };
  }

  const sufficiency = assessResearchSufficiencyForWrite(
    input,
    { facts: input.researchFacts, factCount: input.researchFactCount },
    {
      summary: input.researchBrief,
      v2Axis: {
        researchStatus:
          input.researchDepthTier === "blocked" ? "insufficient" : "ok",
      },
      geminiWriterBrief: input.geminiWriterBrief,
      mode: input.researchMode,
    }
  );

  if (!sufficiency.ok) {
    return {
      ok: false,
      stage: "information_research",
      reasons: sufficiency.reasons,
      userMessage: sufficiency.userMessage,
      factCount: sufficiency.factCount,
    };
  }

  const researchVerify = assertResearchVerificationGate(input);
  if (!researchVerify.ok) {
    return {
      ok: false,
      stage: "research_verify",
      reasons: researchVerify.reasons,
      userMessage: sanitizeCustomerResearchMessage(
        researchVerify.userMessage,
        input,
        researchVerify.reasons
      ),
      preGenerationMetrics: researchVerify.metrics,
      pipelineOrder: researchVerify.pipelineOrder,
      pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
    };
  }

  return {
    ok: true,
    stage: "research_verify",
    factCount: input.researchFactCount ?? input.researchFacts?.length ?? 0,
    expansionReady,
    preGenerationMetrics: researchVerify.metrics,
    pipelineOrder: PIPELINE_ORDER_STRICT,
    pipelineStages: KNOWLEDGE_EXPANSION_STAGES,
  };
}

function userMessageForPreWrite(reasons) {
  if (reasons.includes("missing_axes")) return MESSAGES.missing_axes;
  return MESSAGES.pre_write;
}

/**
 * 조사 직후 1차 검증 (작성 시작 전)
 */
export function verifyPreWriteResearch(parsed, research) {
  const reasons = [];
  const brand = String(parsed?.brand || "").trim();
  const region = String(parsed?.region || "").trim();
  const topic = String(parsed?.topic || "").trim();
  const hasAxes = Boolean(brand && region && topic);
  if (!hasAxes && !parsed?.ok) reasons.push("research_insufficient");

  const pass = hasAxes || reasons.length === 0;
  return {
    pass,
    ok: pass,
    reasons,
    factCount: parsed?.factCount ?? 0,
    verified: pass || parsed?.verified === true,
    depthTier: parsed?.depthTier,
  };
}

/** postProcessLlmBlog에서 이미 V3 후처리된 pack은 재실행하지 않음 */
function resolveV3PostWriteResult(pack, ctx, input) {
  const priorScore = pack?._meta?.v3BrandScore || pack?._meta?.qualityScore?.v3;
  if (pack?._meta?.v3Engine && priorScore) {
    const factCheck = pack._meta?.v3FactCheck;
    return {
      pack,
      score: priorScore,
      factCheck,
      ok: Boolean(priorScore.ok && factCheck?.ok !== false),
      failReasons: [
        ...(priorScore.failReasons || []),
        ...(factCheck?.ok === false ? ["v3_fact_check_fail"] : []),
      ],
    };
  }
  return runV3PostWritePipeline(pack, ctx, input);
}

function applyBetaTestGuardGate(pack, input = {}, ctx = {}) {
  const contentChannel = input.contentChannel || "blog";
  if (!requiresBetaTestGuard(input)) {
    return { ok: true, pack };
  }
  const gate = assertBetaTestGuardWithCorrection(
    pack,
    contentChannel,
    { ...ctx, input },
    input
  );
  if (!gate.passOutput) {
    return {
      ok: false,
      stage: "beta_test_guard",
      reasons: gate.failReasons?.length
        ? gate.failReasons
        : ["beta_test_guard_failed"],
      userMessage: gate.userMessage || formatPostVerifyUserMessage(gate),
      betaTestGuard: gate,
    };
  }
  const stamped = {
    ...gate.pack,
    _meta: {
      ...(gate.pack._meta || {}),
      betaTestGuardPassed: true,
      betaTestGuard: gate.betaTestGuard || gate,
    },
  };
  return { ok: true, pack: stamped, betaTestGuard: gate };
}

/**
 * 작성 완료 후 2차 검증 (출력 전)
 */
export function assertPostWriteDeliverable(input = {}, pack) {
  const contentChannel = input.contentChannel || "blog";
  if (!isChannelPackDeliverable(contentChannel, pack)) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: ["empty_pack"],
      userMessage: resolveDeliveryFailureMessage({ reasons: ["empty_pack"] }),
    };
  }

  if (
    contentChannel === "blog" ||
    contentChannel === "place" ||
    contentChannel === "instagram"
  ) {
    const outlineGate = detectOutlineLeak(pack, contentChannel);
    if (outlineGate.isOutline) {
      return {
        ok: false,
        stage: "output_verify",
        reasons: ["outline_only_output", ...(outlineGate.reasons || [])],
        userMessage: resolveDeliveryFailureMessage({
          reasons: ["outline_only_output"],
        }),
      };
    }
    const v17 = assertV17PreOutput(pack, contentChannel, input);
    if (!v17.ok) {
      const v17SoftOnly =
        contentChannel === "blog" &&
        hasFilledBlogAxes(input) &&
        (v17.reasons || []).every((r) => SOFT_INFORMATION_REASONS.has(r));
      if (!v17SoftOnly) {
        return {
          ok: false,
          stage: "output_verify",
          reasons: v17.reasons,
          userMessage: resolveDeliveryFailureMessage({ reasons: v17.reasons }),
          v17PreOutput: v17,
          v14PreOutput: v17.v14,
        };
      }
      pack = {
        ...pack,
        _meta: {
          ...(pack._meta || {}),
          v17SoftPass: true,
          v17SoftReasons: v17.reasons,
        },
      };
    }
  }

  // 고객 분량 약속(짧은/중간/긴)은 연구 게이트 여부와 무관하게 항상 강제한다.
  if (contentChannel === "blog") {
    let blogPack = pack;
    const corrected = applyEditorPreOutputCorrection(blogPack, input, input);
    blogPack = corrected.pack;

    const lengthGate = assertBlogLengthTier(input, blogPack);
    if (!lengthGate.ok) {
      return {
        ok: false,
        stage: "output_verify",
        reasons: lengthGate.reasons,
        userMessage: resolveDeliveryFailureMessage({
          reasons: lengthGate.reasons,
        }),
        charCount: lengthGate.chars,
        lengthMin: lengthGate.min,
        lengthMax: lengthGate.max,
      };
    }

    const topicPostProof = assertTopicProofPostWrite(blogPack, input);
    if (!topicPostProof.ok) {
      const infoOnlyFail = (topicPostProof.reasons || []).every((r) =>
        ["insufficient_postwrite_info_units"].includes(r)
      );
      const brandFail = (topicPostProof.reasons || []).some((r) =>
        ["brand_swap_template", "brand_generic_body", "brand_presence_low"].includes(r)
      );
      const topicPostSoft =
        hasFilledBlogAxes(input) &&
        infoOnlyFail &&
        !brandFail &&
        input.publicTestMode;
      if (!topicPostSoft) {
        return {
          ok: false,
          stage: "topic_proof_post",
          reasons: topicPostProof.reasons,
          userMessage:
            topicPostProof.userMessage ||
            resolveDeliveryFailureMessage({ reasons: topicPostProof.reasons }),
          topicPostProof,
          needsRegen: topicPostProof.needsRegen,
        };
      }
      blogPack = {
        ...blogPack,
        _meta: {
          ...blogPack._meta,
          topicProofSoftPass: true,
          topicProofReasons: topicPostProof.reasons,
        },
      };
    }

    if (isTopicLockEnforced()) {
      const topicLockPost = assertTopicLockPostWrite(blogPack, input);
      if (!topicLockPost.ok && !topicLockPost.skipped) {
        const sanitized = sanitizeTopicLockViolations(blogPack, input);
        const recheck = assertTopicLockPostWrite(sanitized, input);
        if (!recheck.ok) {
          return {
            ok: false,
            stage: "topic_lock_post",
            reasons: recheck.reasons,
            userMessage:
              recheck.userMessage ||
              resolveDeliveryFailureMessage({ reasons: recheck.reasons }),
            topicLockPost: recheck,
            needsRegen: recheck.needsRegen,
          };
        }
        blogPack = sanitized;
      }
    }

    if (isTopicAnswerEnforced()) {
      const topicAnswer = assertTopicAnswerPostWrite(blogPack, input);
      if (!topicAnswer.ok && !topicAnswer.skipped) {
        const topicAnswerSoft =
          input.publicTestMode &&
          topicAnswer.requiredRate >= 0.45;
        if (!topicAnswerSoft) {
          return {
            ok: false,
            stage: "topic_answer",
            reasons: topicAnswer.reasons,
            userMessage:
              topicAnswer.userMessage ||
              resolveDeliveryFailureMessage({ reasons: topicAnswer.reasons }),
            topicAnswer,
            needsRegen: topicAnswer.needsRegen,
          };
        }
        blogPack = {
          ...blogPack,
          _meta: {
            ...blogPack._meta,
            topicAnswerSoftPass: true,
            topicAnswerReasons: topicAnswer.reasons,
          },
        };
      }
    }

    const paddingGate = detectTopicPaddingViolations(blogPack, input);
    if (!paddingGate.ok) {
      const paddingTypes = paddingGate.failures.map((f) => f.type);
      const paddingSoftOnly =
        hasFilledBlogAxes(input) &&
        paddingTypes.every((t) => SOFT_INFORMATION_REASONS.has(t));
      if (!paddingSoftOnly) {
        return {
          ok: false,
          stage: "review",
          reasons: paddingTypes,
          userMessage:
            paddingGate.failures.find((f) => f.type === "no_new_information")
              ?.message ||
            resolveDeliveryFailureMessage({ reasons: paddingTypes }),
          topicPadding: paddingGate,
        };
      }
      blogPack = {
        ...blogPack,
        _meta: {
          ...blogPack._meta,
          topicPaddingSoftPass: true,
          topicPaddingReasons: paddingTypes,
        },
      };
    }

    const editorGate = corrected.gate || assertEditorPreOutput(blogPack, input, input);
    if (!editorGate.ok) {
      return {
        ok: false,
        stage: "output_verify",
        reasons: editorGate.reasons,
        userMessage: resolveDeliveryFailureMessage({ reasons: editorGate.reasons }),
        editorPreOutput: editorGate,
        charCount: lengthGate.chars,
      };
    }
    pack = {
      ...blogPack,
      _meta: {
        ...(blogPack._meta || {}),
        lengthTierMet: true,
        editorPreOutput: editorGate,
        passOutput: true,
        softPass: false,
      },
    };
  }

  if (!requiresV2ResearchGate(input)) {
    const betaEarly = applyBetaTestGuardGate(pack, input);
    if (!betaEarly.ok) return betaEarly;
    return {
      ok: true,
      stage: "output_verify",
      pack: betaEarly.pack,
      skipped: true,
      betaTestGuard: betaEarly.betaTestGuard,
    };
  }

  const pre = assertPreWriteVerified(input);
  if (!pre.ok) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: pre.reasons,
      userMessage: pre.userMessage,
    };
  }

  const ctx = {
    brandName: input.brandName,
    region: input.region,
    topic: input.topic || input.mainKeyword,
    v2ProductName: input.v2ProductName,
    researchFacts: input.researchFacts,
    researchFactCount: input.researchFactCount ?? input.researchFacts?.length,
    researchDepthTier: input.researchDepthTier,
    v2PreWriteVerified: input.v2PreWriteVerified,
    v2AxisVerified: true,
    v3MasterBrief: input.v3MasterBrief,
    contentChannel,
  };

  const v3Post = input.v3EngineEnforced
    ? resolveV3PostWriteResult(pack, ctx, input)
    : null;

  if (v3Post && !v3Post.ok) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: v3Post.failReasons,
      userMessage: resolveDeliveryFailureMessage({
        reasons: v3Post.failReasons,
      }),
      v3Score: v3Post.score,
      qualityScore: v3Post.score?.total,
    };
  }

  const finalPack = v3Post?.pack || pack;
  const v2Axis =
    v3Post?.score?.v2Axis ||
    evaluateV2Axis(finalPack, ctx, { ...input, contentChannel });
  const qualityScore =
    v3Post?.score?.total ??
    finalPack._meta?.qualityScore?.total ??
    finalPack._meta?.coreQuality?.total ??
    0;

  const reasons = [];
  if (!v2Axis.ok) {
    reasons.push("post_write_quality_failed", ...(v2Axis.failReasons || []));
  }

  const betaGate = applyBetaTestGuardGate(finalPack, input, ctx);

  if (reasons.length) {
    const hardV2 = reasons.some((r) =>
      ["v2axis_banned_template", "v2axis_no_research", "v2axis_insufficient_facts"].includes(
        r
      )
    );
    const firstDelivery = assertFirstDeliveryQuality(betaGate.pack, input);
    const softDeliverable =
      !hardV2 &&
      betaGate.ok &&
      (v2Axis.total ?? 0) >= 76 &&
      firstDelivery.displayReady;
    if (softDeliverable) {
      return {
        ok: true,
        stage: "output_verify",
        pack: stampDeliverablePack(betaGate.pack, input, v2Axis, v3Post?.score),
        v2Axis,
        v3Score: v3Post?.score,
        qualityScore,
        softV2Pass: true,
        betaTestGuard: betaGate.betaTestGuard,
      };
    }
    if (!betaGate.ok) return betaGate;
    return {
      ok: false,
      stage: "output_verify",
      reasons,
      userMessage: resolveDeliveryFailureMessage({
        reasons,
        failReasons: v2Axis.failReasons,
        v2Axis,
        qualityScore,
      }),
      v2Axis,
      qualityScore,
    };
  }

  if (!betaGate.ok) return betaGate;

  const firstDelivery = assertFirstDeliveryQuality(betaGate.pack, input);
  if (!firstDelivery.displayReady) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: firstDelivery.reasons,
      userMessage: resolveDeliveryFailureMessage({
        reasons: firstDelivery.reasons,
        failReasons: firstDelivery.reasons,
      }),
      firstDelivery,
      v2Axis,
      v3Score: v3Post?.score,
      qualityScore,
      betaTestGuard: betaGate.betaTestGuard,
    };
  }

  return {
    ok: true,
    stage: "output_verify",
    pack: stampDeliverablePack(betaGate.pack, input, v2Axis, v3Post?.score),
    v2Axis,
    v3Score: v3Post?.score,
    qualityScore,
    betaTestGuard: betaGate.betaTestGuard,
  };
}

export function stampDeliverablePack(pack, input, v2Axis, v3Score = null) {
  return {
    ...pack,
    _meta: {
      ...pack._meta,
      writtenFromVerifiedResearch: true,
      v2Pipeline: {
        order: V2_PIPELINE_ORDER,
        stages: KNOWLEDGE_EXPANSION_STAGES,
        preWriteVerified: true,
        postWriteVerified: true,
        researchFactCount:
          input.researchFactCount ?? input.researchFacts?.length ?? 0,
        verifiedAt: new Date().toISOString(),
      },
      v3Engine: input.v3EngineEnforced ? "v3" : undefined,
      v3BrandScore: v3Score,
      passOutput:
        Boolean(pack._meta?.passOutput) &&
        Boolean(input.v2PreWriteVerified) &&
        Boolean(pack._meta?.betaTestGuardPassed !== false),
      betaTestGuardPassed: pack._meta?.betaTestGuardPassed ?? true,
      qualityScore: {
        ...(pack._meta?.qualityScore || {}),
        v2Axis,
      },
    },
  };
}

/** API·오케스트레이터 최종 응답 차단 */
export function blockUnverifiedBlogApiResponse(result, input = {}) {
  if (!result?.blogContent) return result;

  if (
    result.withheld === false &&
    (result.softPass ||
      result.meta?.deliveryPreview ||
      result.blogContent?._meta?.deliveryPreview) &&
    !isBriclogMissionEnforced()
  ) {
    return { ...result, ok: result.ok !== false, withheld: false };
  }

  if (isBriclogMissionEnforced() && result.softPass) {
    return researchGateBlockedResult(
      input,
      {
        ok: false,
        userMessage:
          result.userMessage ||
          "품질 기준에 맞추지 못해 보류했습니다. 「다시 받기」를 눌러 주세요.",
        reasons: [
          ...(result.meta?.failReasons || []),
          "llm_soft_pass_withheld",
        ],
      },
      result.blogContent
    );
  }

  const gate = assertPostWriteDeliverable(input, result.blogContent);
  if (gate.ok) {
    if (isBriclogMissionEnforced()) {
      const complete = assertCompleteBlogPackForDelivery(gate.pack, input);
      if (!complete.ok) {
        return researchGateBlockedResult(
          input,
          {
            ok: false,
            userMessage: complete.userMessage || gate.userMessage,
            reasons: complete.reasons,
          },
          gate.pack
        );
      }
    }
    return {
      ...result,
      blogContent: gate.pack,
      withheld: false,
      meta: attachContentQualityToApiMeta(
        {
          ...(result.meta || {}),
          v2PipelineVerified: true,
          v3PipelineVerified: true,
          passOutput: gate.pack._meta?.passOutput,
        },
        gate.pack
      ),
    };
  }

  const preview = deliverBlogDespiteGate(input, result.blogContent, gate, {
    ...result,
    ok: true,
    mode: result.mode || "output_verify_preview",
  });
  if (preview) return preview;

  const lengthBlocked = (gate.reasons || []).some(
    (r) => r === "length_tier_under" || r === "length_tier_over"
  );
  if (lengthBlocked) {
    return researchGateBlockedResult(
      input,
      {
        ok: false,
        userMessage: RETRY.lengthHint,
        reasons: gate.reasons,
      },
      result.blogContent
    );
  }

  const outlineBlocked =
    result.blogContent &&
    detectOutlineLeak(result.blogContent, "blog").isOutline;
  if (outlineBlocked) {
    return researchGateBlockedResult(
      input,
      {
        ok: false,
        userMessage: MESSAGES.post_write,
        reasons: ["outline_only_output"],
      },
      result.blogContent
    );
  }

  if (
    result.blogContent?.sections?.length &&
    hasFilledBlogAxes(input) &&
    !isHardWithholdFailure(gate, result.blogContent) &&
    !input?.publicTestMode
  ) {
    const salvaged = salvageBlogPackForDelivery(result.blogContent, input);
    const forced = deliverBlogDespiteGate(input, salvaged, gate, {
      ...result,
      ok: true,
      mode: "complete_delivery",
    });
    if (forced?.blogContent?.sections?.length) {
      return { ...forced, ok: true, withheld: false, userMessage: null };
    }
  }

  return researchGateBlockedResult(
    input,
    {
      ok: false,
      userMessage: gate.userMessage || formatPostVerifyUserMessage(gate),
      reasons: collectGateReasons(gate),
      stage: gate.stage,
      betaTestGuard: gate.betaTestGuard,
    },
    result.blogContent
  );
}

export function researchGateBlockedResult(input, gate, pack = null) {
  if (input?.publicTestMode) {
    return {
      ok: false,
      withheld: true,
      blogContent: null,
      softPass: false,
      userMessage:
        gate?.userMessage ||
        "입력을 조금만 구체적으로 적어 주세요. 브랜드 · 지역 · 주제가 분명할수록 발행 가능한 샘플이 나옵니다.",
      mode: "public_test_withheld",
      meta: { failReasons: gate?.reasons || gate?.failReasons || [] },
    };
  }

  let body = pack?.sections?.length ? pack : gate?.pack || null;
  if (body?.sections?.length && hasFilledBlogAxes(input)) {
    body = ensureBlogDisplayPack(
      ensureMissionProseTierLength(salvageBlogPackForDelivery(body, input), {
        input,
      }),
      input
    );
  }
  const preview = body
    ? deliverBlogDespiteGate(input, body, gate, { mode: "complete_delivery" })
    : null;
  if (preview?.blogContent?.sections?.length) {
    return { ...preview, userMessage: null, withheld: false, softPass: false };
  }

  if (!body?.sections?.length && hasFilledBlogAxes(input)) {
    const enriched = enrichMinimalBlogInput(input);
    let fallback = buildMissionProseFallbackPack(enriched);
    if (!fallback?.sections?.length) {
      ({ pack: fallback } = buildDeliverableBlogFallback({
        input: enriched,
        failures: gate?.reasons || gate?.failReasons || ["research_gate"],
      }));
    }
    fallback = salvageBlogPackForDelivery(fallback, enriched);
    fallback = applyHumanityFinishPass(
      fallback,
      { input: enriched, ...enriched },
      "blog"
    );
    body = ensureBlogDisplayPack(fallback, enriched);
  }

  if (body?.sections?.length) {
    const rescued = deliverBlogDespiteGate(input, body, gate, {
      ok: true,
      mode: "research_gate_rescue",
    });
    if (rescued?.blogContent?.sections?.length) {
      return {
        ...rescued,
        userMessage: null,
        withheld: false,
        softPass: rescued.softPass ?? false,
      };
    }
    if (hasFilledBlogAxes(input)) {
      const stamped = stampCompleteCustomerDelivery(body, input, {
        researchGateRescue: true,
        failReasons: gate?.reasons || gate?.failReasons || [],
      });
      if (stamped?.sections?.length) {
        return {
          ok: true,
          blogContent: stamped,
          withheld: false,
          softPass: false,
          userMessage: null,
          mode: "research_gate_stamped",
          meta: { failReasons: gate?.reasons || [] },
        };
      }
    }
  }

  return {
    ok: false,
    blogContent: null,
    withheld: true,
    userMessage:
      gate?.userMessage ||
      resolveDeliveryFailureMessage({
        reasons: gate?.reasons || gate?.failReasons || ["human_belief_low"],
      }) ||
      MESSAGES.pre_write,
    mode: "research_gate",
    meta: { failReasons: gate?.reasons || [] },
  };
}
