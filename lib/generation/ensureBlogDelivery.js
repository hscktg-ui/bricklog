import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
import {
  buildMissionProseFallbackPack,
  isCoverageSlotDumpPack,
  replaceCoverageDumpWithMissionProse,
} from "@/lib/llm/missionProseFallback";
import { weaveResearchFactsIntoPack } from "@/lib/content/researchGroundedHumanPack";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildBaseContentLabel } from "@/lib/contentPipeline";
import { fetchBlogWithRetry } from "@/lib/generation/fetchBlogWithRetry";
import {
  assertPreWriteVerified,
  isClientAxisResearchComplete,
  assertPostWriteDeliverable,
  requiresV2ResearchGate,
} from "@/lib/content/v2PipelineGate";
import { shouldWithholdFailedPostVerify } from "@/lib/content/betaTestGuardEngine";
import {
  deliverBlogDespiteGate,
  hasFilledBlogAxes,
  SOFT_PREVIEW_HINT,
} from "@/lib/product/deliverySoftPass";
import {
  resolveBlogUiDelivery,
  salvageBlogPackForDelivery,
} from "@/lib/generation/postVerifySalvage";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate";
import {
  runPostVerifyWithAutoRetry,
  isLengthGateFailure,
} from "@/lib/generation/postVerifyWithRetry";
import { RETRY } from "@/lib/product/craft";
import { isBriclogAlwaysDeliverEnabled } from "@/lib/config/masterRebuildFlags";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import {
  CUSTOMER_PIPELINE_STEP_LABELS,
  formatPostVerifyUserMessage,
  resolveDeliveryFailureMessage,
} from "@/lib/product/customerOutput";
import { scrubCustomerForbiddenSurfaceInPack } from "@/lib/copy/customerFacing";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { isLengthPaddingForbidden, isLengthOnlyGateSoft } from "@/lib/product/briclogMission";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { ensureV17MissionPolish, ensureNaverChannelClean } from "@/lib/content/v17PostProcess";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import {
  finalizeContentQualityForDelivery,
  hasSubstantiveLlmBody,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";
import { applyEditorWriterDeliveryPass } from "@/lib/product/editorWriterDeliveryPass";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import {
  isPublishableBlogPack,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import {
  attachPreWriteContextToPipeline,
  prepareBriclogPreWriteContext,
} from "@/lib/content/briclogPreWriteContext";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import {
  applyInformationalTopicPackGate,
  stripBlogPackHashtags,
} from "@/lib/content/informationalTopicPackGate";
import { applyEditorPreOutputCorrection } from "@/lib/content/editorPreOutputGate";
import {
  runAiEditorAudit,
  attachAiEditorMeta,
} from "@/lib/evolution/aiEditorEngine";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { applyCoreContentEngineGate } from "@/lib/product/coreContentEngine";
import { enrichInputForGeneration } from "@/lib/content/enrichGenerationInput";
import { assessContentExplainabilityForPublish } from "@/lib/product/briclogContentDoctrine";
import { assertCompleteBlogPackForDelivery } from "@/lib/product/completeDeliveryGate";
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { expandLlmPackPreservingBody } from "@/lib/product/llmBodyPreserveRescue";
import {
  isHumanDeliveryGrade,
  stampDeliveryGradeMeta,
} from "@/lib/product/deliveryGrade";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";
import { DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import {
  applyWriterEngineIfNeeded,
  isMissionFallbackPack,
} from "@/lib/product/briclogWriterEngine";
import { tryDeliverForcedMissionProsePack } from "@/lib/product/missionProseRouteEngine";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import {
  finalizeGpt55BlogPackForUi,
  ensureGpt55BlogDisplayPack,
  shouldUseGpt55LightDelivery,
} from "@/lib/product/gpt55LightDelivery";

function stampRescuePackMeta(pack, partial = {}) {
  if (!pack?.sections?.length) return pack;
  const rescue =
    partial?.meta?.draftFallback ||
    partial?.meta?.deliveryRescue ||
    partial?.mode === "draft_fallback" ||
    partial?.mode === "guaranteed_mission_delivery" ||
    partial?.mode === "client_mission_rescue";
  if (!rescue && !pack._meta?.draftFallback && !pack._meta?.deliveryRescue) {
    return pack;
  }
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      draftFallback: pack._meta?.draftFallback ?? partial?.meta?.draftFallback ?? true,
      deliveryRescue:
        pack._meta?.deliveryRescue ??
        partial?.meta?.deliveryRescue ??
        rescue,
      generationMode:
        pack._meta?.generationMode ||
        partial?.meta?.generationMode ||
        partial?.mode,
    },
  };
}

function isRescueDeliveryResult(result = {}) {
  const pack = result?.blogContent;
  return (
    pack?._meta?.deliveryRescue ||
    pack?._meta?.draftFallback ||
    pack?._meta?.missionProseFallback ||
    result?.meta?.draftFallback ||
    result?.meta?.deliveryRescue ||
    result?.mode === "draft_fallback" ||
    result?.mode === "guaranteed_mission_delivery" ||
    result?.mode === "client_mission_rescue" ||
    result?.mode === "guaranteed_mission_draft"
  );
}

function buildContentDoctrineWithholdResult(enriched, partial = {}) {
  const gate = assessContentExplainabilityForPublish(enriched);
  if (gate.ok) return null;
  return {
    ok: false,
    mode: "content_doctrine_withheld",
    llmAvailable: partial?.llmAvailable ?? false,
    blogContent: null,
    softPass: false,
    withheld: true,
    userMessage: gate.userMessage,
    userDetail: null,
    meta: {
      generationMode: "content_doctrine_withheld",
      failReasons: gate.reasons,
      topicExplainable: gate.topicExplainable,
      researchOk: gate.researchOk,
    },
  };
}

function recoverLengthWithStructure(pipelineInput, partial = {}) {
  const blog = partial?.blogContent;
  if (!blog?.sections?.length) return null;
  const normalized = normalizeBlogLengthAndStructure(
    blog,
    pipelineInput,
    pipelineInput
  );
  const recoveredPack = normalized?.pack;
  const lengthGate = assertBlogLengthTier(pipelineInput, recoveredPack);
  if (!lengthGate.ok) return null;
  return {
    ...partial,
    ok: true,
    mode: "length_recovered",
    blogContent: {
      ...recoveredPack,
      _meta: {
        ...(recoveredPack?._meta || {}),
        passOutput: true,
        softPass: false,
        lengthRecovered: true,
      },
    },
    softPass: false,
    withheld: false,
    userMessage: null,
    meta: {
      ...(partial?.meta || {}),
      generationMode: "length_recovered",
      passOutput: true,
      softPass: false,
      lengthRecovered: true,
      charCount: lengthGate.chars,
      min: lengthGate.min,
      max: lengthGate.max,
    },
  };
}

function buildLengthExpansionChunk(pipelineInput, slot = 0) {
  const brand = String(pipelineInput.brandName || "브랜드").trim();
  const region = String(pipelineInput.region || "").trim();
  const topic = String(
    pipelineInput.topic || pipelineInput.mainKeyword || "주제"
  ).trim();
  const industry = String(pipelineInput.industry || "").toLowerCase();
  const isBriclog = /브릭로그/i.test(`${brand} ${topic}`);
  if (isBriclog) {
    const pool = [
      `${brand}는 브랜드 맥락을 유지한 채 블로그·플레이스·인스타 초안을 생성하는 도구입니다.`,
      `생성 후 검수·수정 흐름에서 승인 콘텐츠와 브랜드 메모리를 참고하면 다음 초안의 일관성이 높아집니다.`,
    ];
    return stripMetaLayerTerms(pool[slot % pool.length]);
  }
  const furniture =
    /가구|침대|매트리스|모션베드|템퍼/.test(industry) ||
    /침대|매트리스|모션베드|템퍼/.test(topic.toLowerCase());
  const pool = furniture
    ? [
        `${region ? `${region} ` : ""}${brand} 매장에서 ${topic} 관련 모델을 누워보고 헤드·각도·지지감을 비교해 보세요.`,
        `${topic} 행사가 있다면 대상 모델, 할인 조건, 적용 기간, 카드·증정 혜택을 매장 안내 기준으로 확인하세요.`,
        `구매 전 배송·설치 일정, 교환·A/S 범위, 예산 범위를 함께 점검하면 결정이 수월합니다.`,
        `${region ? `${region} ` : ""}방문 전 영업 시간·주차·예약 가능 여부를 확인하면 체험 동선이 편합니다.`,
      ]
    : [
        `${region ? `${region} ` : ""}${brand} ${topic} — 방문·예약·혜택·이용 방법을 매장·공식 안내 기준으로 확인하세요.`,
        `${topic} 관련 비교 시 가격·조건·일정을 한 번에 정리해 두면 상담이 빨라집니다.`,
        `허구 후기나 과장 표현 없이, 확인 가능한 정보만 기준으로 삼는 편이 좋습니다.`,
      ];
  return stripMetaLayerTerms(pool[slot % pool.length]);
}

function forceFitBlogLength(pack, pipelineInput) {
  if (!pack?.sections?.length) return null;
  if (isLlmOriginatedPack(pack)) return pack;
  const corrected = applyEditorPreOutputCorrection(
    pack,
    pipelineInput,
    pipelineInput
  );
  let next = corrected.pack;
  const strict = enforceStrictBlogLength(next, pipelineInput, pipelineInput, {
    maxAttempts: 18,
  });
  next = strict.pack;
  const gate = assertBlogLengthTier(pipelineInput, next);
  if (!gate.ok || !strict.ok) return null;
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      lengthForceFitted: true,
      lengthStrict: true,
      lengthTierMet: true,
      passOutput: true,
      softPass: false,
      editorPreOutput: corrected.gate,
    },
  };
}

function isLlmHardPassPack(pack = {}) {
  const m = pack._meta || {};
  return (
    m.passOutput === true &&
    !m.draftFallback &&
    !m.missionProseFallback &&
    !m.softPass
  );
}

function refreshBlogPackAfterWriterEngine(pack, input = {}, partial = null) {
  if (!pack?.sections?.length) return pack;
  const enriched = enrichMinimalBlogInput(input);
  const stamped = stampRescuePackMeta(pack, partial || {});
  if (isMissionFallbackPack(stamped, partial || {})) {
    return finalizeRescuePackForUi(stamped, enriched);
  }
  if (shouldUseGpt55LightDelivery(stamped, enriched)) {
    return ensureGpt55BlogDisplayPack(stamped, enriched);
  }
  return ensureBlogDisplayPack(stamped, enriched);
}

function finalizeBlogPackForUi(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (
    shouldUseGpt55LightDelivery(pack, input) &&
    (isLlmHardPassPack(pack) || isLlmOriginatedPack(pack))
  ) {
    return finalizeGpt55BlogPackForUi(pack, input);
  }
  const inbound = pack;
  const enriched = enrichMinimalBlogInput(input);
  const preserveVoice = isLlmHardPassPack(pack) || isLlmOriginatedPack(pack);
  let next = preserveVoice
    ? pack
    : replaceCoverageDumpWithMissionProse(pack, enriched);
  next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
  next = ensureV17MissionPolish(next, enriched, "blog");
  if (!preserveVoice) {
    next = ensureMissionProseTierLength(next, { input: enriched, ...enriched });
  }
  next = applyHumanityFinishPass(next, { input: enriched, ...enriched }, "blog");
  if (!preserveVoice) {
    next = applyCoreContentEngineGate(next, enriched, { input: enriched });
    const aiAudit = runAiEditorAudit(next, enriched, { input: enriched });
    next = attachAiEditorMeta(aiAudit.pack, aiAudit);
    next = applyInformationalTopicPackGate(next, enriched);
  }
  next = ensureNaverChannelClean(next, enriched);
  next = stripBlogPackHashtags(next);
  next = weaveResearchFactsIntoPack(next, enriched);
  next = scrubCustomerForbiddenSurfaceInPack(next);
  const tier = resolveBlogLengthTier(
    enriched.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  if (countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = ensureMissionProseTierLength(next, { input: enriched, ...enriched });
  }
  next = guardPackAgainstShrink(inbound, next, { stage: "finalizeBlogPackForUi" });
  next = finalizeContentQualityForDelivery(next, enriched, "blog");
  return next;
}

function hasDeliverableBlog(content) {
  return Boolean(content?.sections?.length);
}

function hasCustomerVisibleBody(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  return countBlogBodyCharsWithSpaces(pack) >= 80;
}

function hasHumanTierBody(pack, input = {}) {
  return isHumanDeliveryGrade(pack, input);
}

function finalizeRescuePackForUi(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const enriched = enrichMinimalBlogInput(input);
  let next = ensureBlogDisplayPack(pack, enriched);
  if (!next?._meta?.humanGradeFinishingPass) {
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
    next = ensureNaverChannelClean(next, enriched);
    next = stripBlogPackHashtags(next);
    next = scrubCustomerForbiddenSurfaceInPack(next);
    next = stampDeliveryGradeMeta(next, enriched);
  }
  return next;
}

function expandRescuePackToHumanTier(pack, input = {}) {
  const enriched = enrichMinimalBlogInput(input);
  const tier = resolveBlogLengthTier(
    enriched.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  let next = ensureMissionProseTierLength(pack, { input: enriched });
  if (
    countBlogBodyCharsWithSpaces(next) < tier.min &&
    hasUsableResearchFacts(enriched)
  ) {
    const preserved = expandLlmPackPreservingBody(next, enriched, tier);
    if (preserved) {
      next = {
        ...preserved,
        title: pack.title || preserved.title,
        representativeTitle: pack.representativeTitle || preserved.representativeTitle,
        _meta: {
          ...(preserved._meta || {}),
          deliveryRescue: true,
          llmBodyPreserveRescue: true,
        },
      };
    } else if (!isLlmOriginatedPack(next)) {
      const grounded = buildResearchGroundedHumanPack({
        ...enriched,
        blogLengthTier: enriched.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER,
      });
      if (
        grounded?.sections?.length &&
        countBlogBodyCharsWithSpaces(grounded) >
          countBlogBodyCharsWithSpaces(next)
      ) {
        next = {
          ...grounded,
          title: pack.title || grounded.title,
          representativeTitle: pack.representativeTitle || grounded.representativeTitle,
          _meta: {
            ...(grounded._meta || {}),
            deliveryRescue: true,
            researchGroundedRescue: true,
          },
        };
      }
    }
  }
  if (countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = ensureMissionProseTierLength(next, { input: enriched });
  }
  return next;
}

function buildGuaranteedMissionDelivery(pipelineInput) {
  if (isGpt55WriterDominant()) return null;
  if (!hasFilledBlogAxes(pipelineInput)) return null;
  try {
    const enriched = enrichMinimalBlogInput(pipelineInput);
    const { pack: draftPack } = buildDeliverableBlogFallback({
      input: enriched,
      failures: ["guaranteed_rescue"],
    });
    let pack = draftPack?.sections?.length
      ? draftPack
      : buildMissionProseFallbackPack(enriched);
    pack = applyV17PostWritePack(pack, { input: enriched }, "blog");
    pack = expandRescuePackToHumanTier(pack, enriched);
    if (countBlogBodyCharsWithSpaces(pack) < 720) {
      pack = applyHumanityFinishPass(pack, { input: enriched }, "blog");
    }
    pack = {
      ...pack,
      _meta: { ...pack._meta, deliveryRescue: true },
    };
    pack = ensureBlogDisplayPack(pack, enriched);
    if (!pack?.sections?.length) return null;
    const uiPack = finalizeRescuePackForUi(pack, pipelineInput);
    const humanGrade = isHumanDeliveryGrade(uiPack, pipelineInput);
    return {
      ok: true,
      withheld: false,
      softPass: !humanGrade,
      userMessage: humanGrade ? null : SOFT_PREVIEW_HINT,
      mode: humanGrade ? "guaranteed_mission_delivery" : "guaranteed_mission_draft",
      blogContent: {
        ...uiPack,
        _meta: {
          ...(uiPack._meta || {}),
          deliveryPreview: !humanGrade,
          deliveryPreviewMessage: humanGrade ? undefined : SOFT_PREVIEW_HINT,
          softPass: !humanGrade,
        },
      },
      meta: {
        generationMode: "guaranteed_mission_delivery",
        deliveryRescue: true,
        deliveryGrade: uiPack._meta?.deliveryGrade,
        passOutput: humanGrade,
      },
    };
  } catch {
    return null;
  }
}

function ensurePublishableBlogPack(pipelineInput, pack) {
  if (!pack?.sections?.length) return pack;
  if (isLlmOriginatedPack(pack)) return pack;
  if (
    isBriclogMissionEnforced() &&
    isCoverageSlotDumpPack(pack)
  ) {
    return buildMissionProseFallbackPack(
      enrichMinimalBlogInput(pipelineInput)
    );
  }
  if (isPublishableBlogPack(pack)) return pack;
  let next = rewriteOutlinePackToProse(pack, pipelineInput);
  next = applyV17PostWritePack(next, pipelineInput, "blog");
  next = normalizeBlogLengthAndStructure(next, pipelineInput, pipelineInput).pack;
  if (isPublishableBlogPack(next)) return next;
  const { pack: fallback } = buildDeliverableBlogFallback({
    input: enrichMinimalBlogInput(pipelineInput),
    failures: ["outline_only_output"],
  });
  return fallback;
}

function hasCompletedClientResearch(input = {}) {
  return Boolean(
    input.v2ResearchReady ||
    input.v2AxisVerified ||
    input.v2PreWriteVerified ||
    input.knowledgeExpansionReady
  );
}

function applyClientResearchFlags(enriched, pipelineInput) {
  if (!hasCompletedClientResearch(pipelineInput)) return enriched;
  return {
    ...enriched,
    knowledgeExpansionReady: true,
    v2PreWriteVerified:
      enriched.v2PreWriteVerified || pipelineInput.v2PreWriteVerified,
    v2ResearchReady: pipelineInput.v2ResearchReady,
    v2AxisVerified: pipelineInput.v2AxisVerified,
    researchFacts: pipelineInput.researchFacts || enriched.researchFacts,
    researchBrief: pipelineInput.researchBrief || enriched.researchBrief,
  };
}

function buildLocalDeliveryResult(pipelineInput, partial = {}, failures = []) {
  const enriched = applyClientResearchFlags(
    enrichInputForGeneration(enrichMinimalBlogInput(pipelineInput)),
    pipelineInput
  );

  const doctrineBlock = buildContentDoctrineWithholdResult(enriched, partial);
  if (doctrineBlock) return doctrineBlock;

  if (requiresV2ResearchGate(enriched)) {
    const clientResearchDone =
      pipelineInput.v2ResearchReady &&
      pipelineInput.v2PreWriteVerified &&
      hasFilledBlogAxes(pipelineInput);
    const pre = clientResearchDone
      ? { ok: true, reasons: [] }
      : assertPreWriteVerified(enriched);
    if (!pre.ok) {
      return {
        ok: false,
        mode: "knowledge_expansion_blocked",
        llmAvailable: partial?.llmAvailable ?? false,
        blogContent: null,
        softPass: false,
        withheld: true,
        userMessage:
          pre.userMessage ||
          "주제 분해·정보 조사를 완료하지 못해 출력을 보류했습니다.",
        userDetail: null,
        meta: {
          generationMode: "knowledge_expansion_blocked",
          failReasons: pre.reasons || [],
        },
      };
    }
  }

  const ctx = createPromptContext({
    ...enriched,
    researchBrief: pipelineInput.researchBrief,
  });
  const prep = prepareUltimateBlogContext({ ...enriched, ...ctx });
  const { pack: rawPack } = buildDeliverableBlogFallback({
    input: enriched,
    prep,
    bestPack: partial?.blogContent,
    failures,
  });
  const pack = finalizeBlogPackForUi(
    ensurePublishableBlogPack(enriched, rawPack),
    enriched
  );
  const tier = resolveBlogLengthTier(enriched.blogLengthTier || "medium");
  let expanded = pack;
  if (!isLengthPaddingForbidden()) {
    expanded = expandPackByInformation(
      pack,
      { ...ctx, ...enriched },
      enriched,
      { minChars: tier.min, channel: "blog" }
    );
  }
  if (expanded?._meta?.blocked) {
    const recovered = recoverLengthWithStructure(pipelineInput, {
      ...partial,
      blogContent: expanded,
    });
    if (recovered?.blogContent) {
      expanded = recovered.blogContent;
    } else {
      const forced = forceFitBlogLength(expanded, pipelineInput);
      if (forced) expanded = forced;
    }
    if (expanded?._meta?.blocked) {
      if (hasFilledBlogAxes(enriched) && expanded?.sections?.length) {
        const previewPack = {
          ...expanded,
          _meta: {
            ...(expanded._meta || {}),
            blocked: false,
            deliveryPreview: true,
            deliveryPreviewMessage: SOFT_PREVIEW_HINT,
            knowledgeExpansionBlocked: undefined,
            passOutput: false,
            softPass: true,
            deliveryRescue: true,
          },
        };
        return {
          ok: true,
          mode: "knowledge_expansion_preview",
          llmAvailable: partial?.llmAvailable ?? false,
          blogContent: previewPack,
          softPass: true,
          withheld: false,
          userMessage: null,
          meta: {
            generationMode: "knowledge_expansion_preview",
            deliveryPreview: true,
            failReasons: ["no_new_information"],
          },
        };
      }
      return {
        ok: false,
        mode: "knowledge_expansion_blocked",
        llmAvailable: partial?.llmAvailable ?? false,
        blogContent: null,
        softPass: false,
        withheld: true,
        userMessage:
          expanded._meta?.knowledgeExpansionBlocked?.userMessage ||
          "이번에는 분량·조사 깊이가 부족해요. 입력을 보강하거나 「짧은 글」로 바꾼 뒤 「다시 받기」를 눌러 주세요.",
        userDetail: null,
        meta: {
          generationMode: "no_new_information",
          failReasons: ["no_new_information"],
        },
      };
    }
  }
  const finalPack =
    isLlmOriginatedPack(expanded, partial) || expanded?._meta?.draftFallback
      ? expanded
      : applyEditorPreOutputCorrection(expanded, enriched, enriched).pack;
  const lengthGate = assertBlogLengthTier(enriched, finalPack);
  const lengthBlocksDelivery =
    !lengthGate.ok && !isLengthOnlyGateSoft();
  if (lengthBlocksDelivery) {
    const recovered = recoverLengthWithStructure(pipelineInput, {
      ...partial,
      blogContent: finalPack,
    });
    if (recovered) return recovered;
    const forced = forceFitBlogLength(finalPack, pipelineInput);
    if (forced) {
      return {
        ok: true,
        mode: "length_force_fitted",
        llmAvailable: partial?.llmAvailable ?? false,
        blogContent: forced,
        softPass: false,
        withheld: false,
        userMessage: null,
        userDetail: null,
        baseContentLabel:
          partial?.baseContentLabel || buildBaseContentLabel(enriched, forced),
        meta: {
          generationMode: "length_force_fitted",
          passOutput: true,
          softPass: false,
          blogCharCount: countBlogBodyCharsWithSpaces(forced),
        },
        personalization: partial?.personalization,
        usageWarning: partial?.usageWarning,
        usage: partial?.usage,
      };
    }
    return {
      ok: false,
      mode: "length_withheld",
      llmAvailable: partial?.llmAvailable ?? false,
      blogContent: null,
      softPass: false,
      withheld: true,
      userMessage: RETRY.lengthHint,
      userDetail: `목표 ${lengthGate.min}~${lengthGate.max}자 (현재 ${lengthGate.chars}자)`,
      meta: {
        generationMode: "length_withheld",
        passOutput: false,
        softPass: false,
        lengthTierFailed: true,
        charCount: lengthGate.chars,
        min: lengthGate.min,
        max: lengthGate.max,
      },
    };
  }
  if ((lengthGate.ok || isLengthOnlyGateSoft()) && requiresV2ResearchGate(enriched)) {
    const salvagedForPost = salvageBlogPackForDelivery(finalPack, enriched);
    const post = assertPostWriteDeliverable(
      { ...enriched, contentChannel: "blog" },
      salvagedForPost
    );
    if (!post.ok) {
      for (const candidate of [salvagedForPost, finalPack]) {
        const preview = deliverBlogDespiteGate(
          enriched,
          candidate,
          post,
          {
            mode: post.stage || "output_verify_preview",
            llmAvailable: partial?.llmAvailable ?? false,
            baseContentLabel:
              partial?.baseContentLabel ||
              buildBaseContentLabel(enriched, candidate),
            meta: {
              generationMode: "local_delivery_preview",
              draftFallback: true,
              failReasons: post.reasons || [],
              betaTestGuard: post.betaTestGuard,
            },
          }
        );
        if (preview?.blogContent?.sections?.length) {
          return {
            ...preview,
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
        if (candidate?.sections?.length) {
          return {
            ok: true,
            mode: "local_delivery_preview",
            llmAvailable: partial?.llmAvailable ?? false,
            blogContent: finalizeBlogPackForUi(
              {
                ...candidate,
                _meta: {
                  ...(candidate._meta || {}),
                  deliveryPreview: true,
                  deliveryPreviewMessage: SOFT_PREVIEW_HINT,
                  passOutput: false,
                  softPass: true,
                  uiDeliveryForced: true,
                },
              },
              enriched
            ),
            softPass: true,
            withheld: false,
            userMessage: null,
            baseContentLabel:
              partial?.baseContentLabel ||
              buildBaseContentLabel(enriched, candidate),
            meta: {
              generationMode: "local_delivery_preview",
              failReasons: post.reasons || [],
              uiDeliveryForced: true,
            },
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
      }
      return {
        ok: false,
        mode: post.stage || "output_verify_blocked",
        llmAvailable: partial?.llmAvailable ?? false,
        blogContent: null,
        softPass: false,
        withheld: true,
        userMessage:
          post.userMessage ||
          formatPostVerifyUserMessage(post),
        userDetail: null,
        meta: {
          generationMode: "beta_test_guard_blocked",
          failReasons: post.reasons || [],
          betaTestGuard: post.betaTestGuard,
        },
      };
    }
    return {
      ok: true,
      mode: "draft_fallback",
      llmAvailable: partial?.llmAvailable ?? false,
      blogContent: stampRescuePackMeta(post.pack, {
        mode: "draft_fallback",
        meta: { draftFallback: true, deliveryRescue: true },
      }),
      softPass: false,
      withheld: false,
      userMessage: null,
      userDetail: null,
      baseContentLabel:
        partial?.baseContentLabel ||
        buildBaseContentLabel(enriched, post.pack),
      meta: {
        generationMode: "local_delivery_fallback",
        draftFallback: true,
        blogCharCount: lengthGate.chars,
        softPass: false,
        passOutput: true,
        v2PipelineVerified: true,
        betaTestGuard: post.betaTestGuard,
      },
      personalization: partial?.personalization,
      usageWarning: partial?.usageWarning,
      usage: partial?.usage,
    };
  }

  const lengthDeliverable = lengthGate.ok || isLengthOnlyGateSoft();
  if (lengthDeliverable && isBriclogMissionEnforced()) {
    const complete = assertCompleteBlogPackForDelivery(finalPack, enriched);
    if (!complete.ok) {
      return {
        ok: false,
        mode: "content_complete_withheld",
        llmAvailable: partial?.llmAvailable ?? false,
        blogContent: null,
        softPass: false,
        withheld: true,
        userMessage: complete.userMessage,
        userDetail: null,
        meta: {
          generationMode: "content_complete_withheld",
          failReasons: complete.reasons,
        },
      };
    }
  }
  return {
    ok: lengthDeliverable,
    mode: lengthDeliverable ? "draft_fallback" : "length_withheld",
    llmAvailable: partial?.llmAvailable ?? false,
    blogContent: lengthDeliverable
      ? stampRescuePackMeta(finalPack, {
          mode: "draft_fallback",
          meta: { draftFallback: true, deliveryRescue: true },
        })
      : null,
    softPass: false,
    withheld: !lengthDeliverable,
    userMessage: lengthDeliverable
      ? null
      : RETRY.lengthHint,
    userDetail: lengthDeliverable
      ? null
      : `목표 ${lengthGate.min}~${lengthGate.max}자 (현재 ${lengthGate.chars}자)`,
    baseContentLabel:
      lengthDeliverable && (partial?.baseContentLabel || buildBaseContentLabel(enriched, finalPack)),
    meta: {
      generationMode: lengthDeliverable ? "local_delivery_fallback" : "length_withheld",
      draftFallback: lengthDeliverable,
      blogCharCount: lengthGate.chars,
      softPass: false,
      passOutput: lengthDeliverable,
      lengthTierMet: lengthGate.ok,
      lengthSoft: !lengthGate.ok && isLengthOnlyGateSoft() || undefined,
    },
    personalization: partial?.personalization,
    usageWarning: partial?.usageWarning,
    usage: partial?.usage,
  };
}

function isServerVerifiedDelivery(partial) {
  return (
    partial?.blogContent?.sections?.length &&
    partial?.meta?.passOutput === true &&
    partial?.meta?.v2PipelineVerified === true &&
    !partial?.withheld
  );
}

export function deliverWithOptionalPostVerify(pipelineInput, partial, v2Gate, hooks = {}) {
  const { setPipelineStep } = hooks;
  let blog = ensurePublishableBlogPack(
    pipelineInput,
    partial?.blogContent
  );
  if (!hasDeliverableBlog(blog)) return null;

  if (
    !isLlmOriginatedPack(blog) &&
    (partial?.mode === "llm" ||
      String(partial?.mode || "").startsWith("llm") ||
      partial?.meta?.generationMode === "llm" ||
      String(partial?.meta?.generationMode || "").startsWith("llm_"))
  ) {
    blog = {
      ...blog,
      _meta: {
        ...(blog._meta || {}),
        llmGenerated: true,
        generationMode: "llm",
      },
    };
  }

  if (v2Gate && isServerVerifiedDelivery(partial)) {
    return {
      ...partial,
      ok: true,
      blogContent: blog,
      softPass: false,
      withheld: false,
      userMessage: null,
      meta: {
        ...(partial.meta || {}),
        v2PipelineVerified: true,
        v3PipelineVerified: true,
        softPass: false,
        passOutput: true,
        serverVerifiedSkipClientReverify: true,
      },
    };
  }

  if (!isLlmOriginatedPack(blog)) {
    const corrected = applyEditorPreOutputCorrection(blog, pipelineInput, pipelineInput);
    blog = corrected.pack;
  }

  if (v2Gate) {
    const verify = runPostVerifyWithAutoRetry(pipelineInput, blog, {
      setPipelineStep,
      recoverLength: () => recoverLengthWithStructure(pipelineInput, partial),
    });
    if (verify.ok) {
      blog = verify.pack;
    } else if (shouldWithholdFailedPostVerify(pipelineInput)) {
      if (
        isLlmOriginatedPack(blog, partial) &&
        hasSubstantiveLlmBody(blog, pipelineInput)
      ) {
        const polished = finalizeContentQualityForDelivery(
          finalizeBlogPackForUi(blog, pipelineInput),
          pipelineInput,
          "blog"
        );
        if (polished?.sections?.length) {
          return {
            ok: true,
            blogContent: polished,
            withheld: false,
            softPass: false,
            userMessage: null,
            mode: "llm_mission_delivery",
            meta: {
              ...(partial.meta || {}),
              v2PipelineVerified: false,
              passOutput: polished._meta?.publishReady ?? true,
              llmMissionDelivery: true,
              failReasons: verify.post?.reasons || [],
              autoRetried: verify.autoRetried,
            },
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
      }
      const salvaged = salvageBlogPackForDelivery(
        verify.pack || blog,
        pipelineInput
      );
      for (const candidate of [salvaged, verify.pack, blog]) {
        const preview = deliverBlogDespiteGate(
          pipelineInput,
          candidate,
          verify.post || {},
          {
            ...partial,
            ok: true,
            mode: verify.post?.stage || "output_verify_preview",
            llmAvailable: partial?.llmAvailable ?? false,
            userMessage: null,
            meta: {
              ...(partial.meta || {}),
              v2PipelineVerified: false,
              passOutput: false,
              deliveryPreview: true,
              autoRetried: verify.autoRetried,
              failReasons: verify.post?.reasons || [],
              betaTestGuard: verify.post?.betaTestGuard,
              draftFallback: partial?.meta?.draftFallback,
            },
          }
        );
        if (preview?.blogContent?.sections?.length) {
          return {
            ...preview,
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
      }
      for (const raw of [salvaged, verify.pack, blog]) {
        if (!raw?.sections?.length) continue;
        const editorial = applyEditorialPackGate(
          salvageBlogPackForDelivery(raw, pipelineInput),
          { input: pipelineInput, ...pipelineInput }
        );
        const preview = deliverBlogDespiteGate(
          pipelineInput,
          editorial,
          verify.post || {},
          {
            ...partial,
            ok: true,
            mode: verify.post?.stage || "output_verify_preview",
            llmAvailable: partial?.llmAvailable ?? false,
            userMessage: null,
            meta: {
              ...(partial.meta || {}),
              v2PipelineVerified: false,
              passOutput: false,
              deliveryPreview: true,
              editorialRescue: true,
              autoRetried: verify.autoRetried,
              failReasons: verify.post?.reasons || [],
              betaTestGuard: verify.post?.betaTestGuard,
            },
          }
        );
        if (preview?.blogContent?.sections?.length) {
          return {
            ...preview,
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
      }
      const lastResort = salvageBlogPackForDelivery(
        salvaged || verify.pack || blog,
        pipelineInput
      );
      if (lastResort?.sections?.length && hasFilledBlogAxes(pipelineInput)) {
        const preview = deliverBlogDespiteGate(
          pipelineInput,
          lastResort,
          verify.post || {},
          {
            ...partial,
            ok: true,
            mode: "output_verify_rescue",
            llmAvailable: partial?.llmAvailable ?? false,
            meta: {
              ...(partial.meta || {}),
              v2PipelineVerified: false,
              passOutput: false,
              deliveryRescue: true,
              failReasons: verify.post?.reasons || [],
            },
          }
        );
        if (preview?.blogContent?.sections?.length) {
          return {
            ...preview,
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
        return {
          ok: true,
          blogContent: finalizeBlogPackForUi(
            {
              ...lastResort,
              _meta: {
                ...(lastResort._meta || {}),
                deliveryPreview: true,
                deliveryPreviewMessage: SOFT_PREVIEW_HINT,
                passOutput: false,
                softPass: true,
                displayReady: false,
                uiDeliveryForced: true,
              },
            },
            pipelineInput
          ),
          withheld: false,
          softPass: true,
          userMessage: null,
          mode: "output_verify_forced",
          meta: {
            failReasons: verify.post?.reasons || [],
            v2PipelineVerified: false,
            passOutput: false,
            uiDeliveryForced: true,
          },
        };
      }
      if (blog?.sections?.length) {
        const llmFallback = finalizeBlogPackForUi(blog, pipelineInput);
        const ui = resolveBlogUiDelivery(llmFallback, pipelineInput, {
          ...partial,
          withheld: false,
          userMessage: null,
        });
        if (ui.ok && ui.pack?.sections?.length) {
          return {
            ok: true,
            blogContent: ui.pack,
            withheld: false,
            softPass: true,
            userMessage: null,
            mode: "llm_verify_soft_delivery",
            meta: {
              ...(partial.meta || {}),
              failReasons: verify.post?.reasons || [],
              v2PipelineVerified: false,
              passOutput: false,
              llmSoftDelivery: true,
              autoRetried: verify.autoRetried,
            },
            personalization: partial?.personalization,
            usageWarning: partial?.usageWarning,
            usage: partial?.usage,
          };
        }
      }
      const guaranteed = buildGuaranteedMissionDelivery(pipelineInput);
      if (hasCustomerVisibleBody(guaranteed?.blogContent)) {
        return {
          ...guaranteed,
          personalization: partial?.personalization,
          usageWarning: partial?.usageWarning,
          usage: partial?.usage,
        };
      }
      return null;
    } else {
      blog = {
        ...blog,
        _meta: {
          ...blog._meta,
          softPass: true,
          passOutput: true,
          postVerifySoft: true,
          failReasons: verify.post?.reasons,
        },
      };
    }
  }

  const verified =
    v2Gate && shouldWithholdFailedPostVerify(pipelineInput)
      ? Boolean(blog._meta?.writtenFromVerifiedResearch || blog._meta?.v2Pipeline)
      : true;

  return {
    ...partial,
    ok: true,
    blogContent: finalizeBlogPackForUi(blog, pipelineInput),
    softPass: !verified,
    withheld: false,
    userMessage: null,
    meta: {
      ...(partial.meta || {}),
      v2PipelineVerified: verified,
      v3PipelineVerified: verified,
      softPass: !verified,
      passOutput: verified,
    },
  };
}

/**
 * API·로컬 모두 실패했을 때 화면용 최후 fallback
 */
export function forceLocalBlogPreviewDelivery(pipelineInput, partial = null) {
  if (!hasFilledBlogAxes(pipelineInput)) return null;
  const local = buildLocalDeliveryResult(
    pipelineInput,
    partial,
    partial ? ["client_rescue"] : ["client_rescue_unreachable"]
  );
  if (local?.blogContent?.sections?.length) {
    return {
      ...local,
      ok: true,
      withheld: false,
      blogContent: finalizeRescuePackForUi(local.blogContent, pipelineInput),
    };
  }
  if (partial?.blogContent?.sections?.length) {
    return {
      ...partial,
      ok: true,
      withheld: false,
      blogContent: finalizeRescuePackForUi(
        stampRescuePackMeta(partial.blogContent, partial),
        pipelineInput
      ),
      mode: partial.mode || "client_mission_rescue",
    };
  }
  try {
    const guaranteed = buildGuaranteedMissionDelivery(pipelineInput);
    if (
      guaranteed?.blogContent?.sections?.length &&
      countBlogBodyCharsWithSpaces(guaranteed.blogContent) >= 600
    ) {
      return guaranteed;
    }
  } catch {
    /* ignore */
  }
  const enriched = enrichMinimalBlogInput(pipelineInput);
  const { pack: rescuePack } = buildDeliverableBlogFallback({
    input: enriched,
    failures: ["force_local_rescue"],
  });
  if ((rescuePack?.sections?.length || 0) >= 2) {
    let uiPack = applyEditorWriterDeliveryPass(
      {
        ...rescuePack,
        _meta: {
          ...(rescuePack._meta || {}),
          deliveryRescue: true,
          draftFallback: true,
        },
      },
      enriched
    );
    uiPack = scrubCustomerForbiddenSurfaceInPack(uiPack);
    uiPack = stampDeliveryGradeMeta(uiPack, enriched);
    return {
      ok: true,
      withheld: false,
      mode: "client_mission_rescue",
      blogContent: uiPack,
    };
  }
  return local?.blogContent?.sections?.length ? local : null;
}

function guaranteeBlogDeliveryResult(pipelineInput, result, partial = null) {
  if (hasCustomerVisibleBody(result?.blogContent)) {
    const isRescue = isRescueDeliveryResult(result);
    const uiPack = isRescue
      ? finalizeRescuePackForUi(result.blogContent, pipelineInput)
      : finalizeBlogPackForUi(result.blogContent, pipelineInput);
    if (uiPack?._meta?.placeholderWithheld) {
      if (isBriclogAlwaysDeliverEnabled()) {
        const scrubbed = scrubPlaceholderFromPack(uiPack);
        if (hasCustomerVisibleBody(scrubbed)) {
          return {
            ...result,
            blogContent: scrubbed,
            withheld: false,
            ok: true,
            meta: {
              ...(result.meta || {}),
              alwaysDeliver: true,
              placeholderScrubbed: true,
            },
          };
        }
      }
      const rescued = forceLocalBlogPreviewDelivery(pipelineInput, {
        ...partial,
        blogContent: uiPack,
      });
      if (hasCustomerVisibleBody(rescued?.blogContent) && !rescued.blogContent?._meta?.placeholderWithheld) {
        return rescued;
      }
      return {
        ...result,
        ok: false,
        withheld: true,
        blogContent: null,
        userMessage: "미완성 표현이 감지되어 다시 작성합니다. 「다시 받기」를 눌러 주세요.",
        mode: "placeholder_withheld",
        meta: {
          ...(result.meta || {}),
          failReasons: [
            ...new Set([
              ...(result.meta?.failReasons || []),
              "placeholder_contamination",
            ]),
          ],
          generationMode: "placeholder_withheld",
        },
      };
    }
    return {
      ...result,
      ok: true,
      withheld: false,
      blogContent: uiPack,
    };
  }
  const rescued = forceLocalBlogPreviewDelivery(pipelineInput, partial);
  if (hasCustomerVisibleBody(rescued?.blogContent)) return rescued;
  const guaranteed = buildGuaranteedMissionDelivery(pipelineInput);
  if (hasCustomerVisibleBody(guaranteed?.blogContent)) return guaranteed;
  if (result?.ok && !hasCustomerVisibleBody(result?.blogContent)) {
    return {
      ...result,
      ok: false,
      withheld: true,
      blogContent: null,
      userMessage:
        "본문을 만들지 못했어요. 「다시 받기」를 눌러 주세요.",
      mode: "empty_pack_withheld",
      meta: {
        ...(result.meta || {}),
        failReasons: [
          ...new Set([...(result.meta?.failReasons || []), "empty_pack"]),
        ],
        generationMode: "empty_pack_withheld",
      },
    };
  }
  return result;
}

/**
 * API 실패·검수 미달이어도 화면에 쓸 글을 반환 (브랜드·지역·주제만 있으면 항상 출력)
 */
export async function ensureBlogDelivery(pipelineInput, hooks = {}) {
  const { setPipelineStep } = hooks;
  const v2Gate = requiresV2ResearchGate(pipelineInput);
  let partial = null;

  const forcedMission = tryDeliverForcedMissionProsePack(pipelineInput);
  if (forcedMission?.ok && forcedMission?.blogContent?.sections?.length) {
    return forcedMission;
  }

  if (v2Gate) {
    setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.researchVerify);
    const pre =
      isClientAxisResearchComplete(pipelineInput) &&
      hasFilledBlogAxes(pipelineInput)
        ? { ok: true }
        : assertPreWriteVerified(pipelineInput);
    if (!pre.ok) {
      return {
        ok: false,
        blogContent: null,
        userMessage: pre.userMessage,
        mode: pre.stage === "research_verify" || pre.reasons?.includes("missing_axes")
          ? "research_verify_blocked"
          : "knowledge_expansion_blocked",
        meta: {
          failReasons: pre.reasons || [],
          preGenerationMetrics: pre.preGenerationMetrics || null,
          pipelineOrder: pre.pipelineOrder || null,
        },
      };
    }
    setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.write);
  }

  try {
    partial = await fetchBlogWithRetry(pipelineInput, hooks);
    if (partial?.ok === false && partial?.blogContent) {
      partial = { ...partial, ok: true };
    }

    const inboundPack = partial?.blogContent;
    const delivered = deliverWithOptionalPostVerify(
      pipelineInput,
      partial,
      v2Gate,
      hooks
    );
    if (delivered) {
      if (
        !delivered.blogContent?.sections?.length &&
        inboundPack?.sections?.length &&
        isLlmOriginatedPack(inboundPack, partial)
      ) {
        const rescued = finalizeContentQualityForDelivery(
          finalizeBlogPackForUi(inboundPack, pipelineInput),
          pipelineInput,
          "blog"
        );
        if (rescued?.sections?.length) {
          const writerPack = await applyWriterEngineIfNeeded(
            rescued,
            pipelineInput,
            hooks
          );
          return guaranteeBlogDeliveryResult(
            pipelineInput,
            {
              ...delivered,
              ok: true,
              blogContent: refreshBlogPackAfterWriterEngine(
                writerPack,
                pipelineInput,
                partial
              ),
              withheld: false,
              softPass: false,
              userMessage: null,
              mode: "llm_inbound_rescue",
            },
            partial
          );
        }
      }
      if (delivered.blogContent?.sections?.length) {
        delivered.blogContent = refreshBlogPackAfterWriterEngine(
          await applyWriterEngineIfNeeded(
            delivered.blogContent,
            pipelineInput,
            hooks
          ),
          pipelineInput,
          { ...delivered, ...partial }
        );
      }
      return guaranteeBlogDeliveryResult(pipelineInput, delivered, partial);
    }
  } catch (err) {
    if (err?.payload?.blogContent?.sections?.length) {
      partial = err.payload;
    }
  }

  setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.review);
  const local = buildLocalDeliveryResult(
    pipelineInput,
    partial,
    partial ? ["api_incomplete"] : ["api_unreachable"]
  );
  return guaranteeBlogDeliveryResult(pipelineInput, local, partial);
}
