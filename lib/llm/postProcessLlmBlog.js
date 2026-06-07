/**
 * LLM 응답 → Ultimate 검수 파이프라인
 */
import { parseOpenAIJson, normalizeBlogFromAI } from "@/lib/prompts/parseResponse";
import { enrichBlogPack } from "@/lib/prompts/engine/enrichOutput";
import { sanitizeBlogPack } from "@/lib/integrity/blogSanitizer";
import { applyConstitutionToBlogPack } from "@/lib/constitution/writingConstitution";
import {
  applyConstitutionV2ToBlogPack,
  evaluateWritingConstitutionV2,
} from "@/lib/constitution/writingConstitutionV2";
import { alignBodyToTitle, evaluateContentQualityRoot } from "@/lib/quality/contentQualityRoot";
import { ensureBrandPresenceInPack } from "@/lib/persona/humanWritingFramework";
import { runHardValidation } from "@/lib/pipeline/v2/hardValidation";
import { runFinalAudit } from "@/lib/ultimate/finalAudit";
import { runFinalSelfReviewUltimate } from "@/lib/ultimate/finalSelfReviewUltimate";
import { detectNoCopyViolations } from "@/lib/ultimate/noCopyPolicy";
import {
  runV4CoreAudit,
  runV4BackgroundAudit,
} from "@/lib/quality/v4ContentAudit";
import { finalizePipelineMeta } from "@/lib/pipeline/v2/runBlogPipelineV2";
import { deriveTitleQuestion } from "@/lib/pipeline/v2/titleUnderstanding";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { runSensitiveComplianceScan } from "@/lib/compliance/sensitiveFactCheck";
import {
  scoreCoreContent,
  labelsForMeta,
  CORE_TARGET_SCORE,
} from "@/lib/quality/coreQualityEngine";
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { pruneOffAxisSentences } from "@/lib/content/v2AxisSentencePrune";
import { requiresV2ResearchGate } from "@/lib/content/v2PipelineGate";
import { runV3PostWritePipeline } from "@/lib/content/v3/pipeline";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import {
  hasMetaLayerLeak,
  sanitizeBlogPackMetaLayer,
} from "@/lib/content/metaLayerSeparation";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { assertV17PreOutput } from "@/lib/content/v17ContentGate";
import { applyV17PostWritePack, ensureNaverChannelClean } from "@/lib/content/v17PostProcess";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { scoreBriclogEngine } from "@/lib/product/briclogEngineScore";
import { sanitizeBlogPackPlannerLeak } from "@/lib/content/sectionPlannerSanitize";
import { applyBrandContentEngine } from "@/lib/content/brandContentEngine";
import { applyPerspectiveEngine } from "@/lib/content/perspectiveEngine";
import {
  applyEditorQualityPack,
} from "@/lib/content/editorQualityEngine";
import {
  assertEditorPreOutput,
  applyEditorPreOutputCorrection,
} from "@/lib/content/editorPreOutputGate";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { finishBlogPackLocal } from "@/lib/generation/briclogLocalFinish";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { resolvePassOutputAfterHumanityPass } from "@/lib/product/firstDeliveryQuality";
import { HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import {
  getStrictLengthMaxAttempts,
  shouldSkipOffAxisPrune,
} from "@/lib/config/briclogFastPipeline";

export function parseLlmBlogResponse(raw, ctx) {
  const parsed = parseOpenAIJson(raw);
  const blog = parsed?.blog || (parsed?.sections ? parsed : null);
  if (!blog?.sections?.length) return null;
  return normalizeBlogFromAI(blog, ctx);
}

export function postProcessLlmBlog(pack, ctx, input = {}) {
  if (!pack) return null;

  let next = sanitizeBlogPackMetaLayer(
    sanitizeBlogPack(pack, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
    })
  );

  next = ensureBrandPresenceInPack(next, ctx);
  next = applyConstitutionToBlogPack(next, ctx);
  next = applyConstitutionV2ToBlogPack(next, ctx);
  next = applyBrandContentEngine(next, ctx, input);
  next = applyPerspectiveEngine(next, ctx, input);
  next = alignBodyToTitle(next, ctx);

  next = enrichBlogPack(next, { ...ctx, main: ctx.main }, {
    includePhrases: ctx.includeList?.join(", "),
    includeList: ctx.includeList,
    storeFeatures: ctx.storeFeatures,
    benefit: ctx.benefit,
    brandDescription: ctx.brandDescription,
    excludePhrases: ctx.excludeList?.join(", "),
    industryKey: ctx.industryKey,
  });

  let lengthNormalized = normalizeBlogLengthAndStructure(next, ctx, input);
  next = lengthNormalized.pack;

  next = applyV17PostWritePack(next, { ...ctx, input }, "blog");
  next = ensureMissionProseTierLength(next, { ...ctx, input });
  lengthNormalized = normalizeBlogLengthAndStructure(next, ctx, input);
  next = sanitizeBlogPackPlannerLeak(lengthNormalized.pack);

  const researchFacts = input.researchFacts || ctx.researchFacts || [];
  const pruned = shouldSkipOffAxisPrune()
    ? { pack: next, removedCount: 0, removedSamples: [] }
    : pruneOffAxisSentences(next, ctx, researchFacts);
  next = pruned.pack;
  // Prune 단계에서 본문이 짧아질 수 있으므로 길이 규격을 다시 맞춘다.
  lengthNormalized = normalizeBlogLengthAndStructure(next, ctx, input);
  next = lengthNormalized.pack;
  next = applyBrandContentEngine(next, ctx, input);
  next = applyPerspectiveEngine(next, ctx, input);
  next = sanitizeBlogPackPlannerLeak(next);

  const corrected = applyEditorPreOutputCorrection(next, ctx, input);
  next = corrected.pack;

  const v2EvalInput = {
    ...input,
    researchFacts,
    v2OffAxisRemoved: pruned.removedCount,
  };

  const v4Core = runV4CoreAudit(next, ctx);
  const v4Background = runV4BackgroundAudit(next, ctx, input);
  const hardValidation = v4Core.hard;
  const noCopy = detectNoCopyViolations(next, ctx.brandResearch);
  const constitutionV2 = evaluateWritingConstitutionV2(next, ctx, "blog");
  const coreQuality = scoreCoreContent(next, { ...ctx, input: v2EvalInput }, "blog");
  const v2Axis = evaluateV2Axis(next, ctx, v2EvalInput);
  const qualityScore = v4Background.qualityScore || { total: 0, breakdown: {} };
  qualityScore.core = coreQuality;
  qualityScore.v2Axis = v2Axis;
  qualityScore.total = coreQuality.total;
  qualityScore.breakdown = coreQuality.breakdown;
  qualityScore.failReasons = coreQuality.failReasons;
  qualityScore.pass = coreQuality.pass;
  qualityScore.target = CORE_TARGET_SCORE;
  if (constitutionV2) {
    qualityScore.constitutionV2 = constitutionV2;
    if (!constitutionV2.ok) {
      qualityScore.total = Math.min(qualityScore.total, 85);
    }
  }
  if (v2Axis && !v2Axis.ok) {
    qualityScore.total = Math.min(qualityScore.total, v2Axis.total);
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      ...(v2Axis.failReasons || []),
    ];
    coreQuality.pass = false;
  }

  const outlineLeak = detectOutlineLeak(next);
  if (outlineLeak.isOutline) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "outline_only_output",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 70);
    next._meta = {
      ...(next._meta || {}),
      outlineLeak: true,
      outlineLeakReasons: outlineLeak.reasons,
    };
  }

  const metaLeakDetected = hasMetaLayerLeak(getBlogFullText(next));
  const v17Gate = assertV17PreOutput(next, "blog", { ...ctx, input });
  if (!v17Gate.ok) {
    for (const r of v17Gate.reasons || []) {
      if (!coreQuality.failReasons.includes(r)) {
        coreQuality.failReasons.push(r);
      }
    }
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(
      qualityScore.total,
      v17Gate.reviewerScore ?? 82
    );
    next._meta = {
      ...(next._meta || {}),
      v17PreOutput: v17Gate,
      v14PreOutput: v17Gate.v14,
      v13PreOutput: v17Gate.v14?.v13,
    };
  }

  if (metaLeakDetected) {
    next = sanitizeBlogPackMetaLayer(next);
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "meta_layer_term_leak",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 85);
  }

  let v3Post = null;
  if (input.v3EngineEnforced || input.v3PreWriteVerified) {
    v3Post = runV3PostWritePipeline(next, ctx, input);
    next = v3Post.pack;
    lengthNormalized = normalizeBlogLengthAndStructure(next, ctx, input);
    next = lengthNormalized.pack;
    const strictAfterV3 = enforceStrictBlogLength(next, ctx, input, {
      maxAttempts: getStrictLengthMaxAttempts(),
    });
    next = strictAfterV3.pack;
    lengthNormalized = {
      ...lengthNormalized,
      charCount: countBlogBodyCharsWithSpaces(next),
      lengthOk: strictAfterV3.ok,
    };
    qualityScore.v3 = v3Post.score;
    qualityScore.total = Math.min(qualityScore.total, v3Post.score?.total ?? 100);
    if (!v3Post.ok) {
      coreQuality.failReasons = [
        ...(coreQuality.failReasons || []),
        ...(v3Post.failReasons || []),
      ];
      coreQuality.pass = false;
      qualityScore.pass = false;
    }
  }

  const mergedFailReasons = [
    ...(coreQuality.failReasons || []),
    ...(v2Axis?.failReasons || []),
    ...(v3Post?.failReasons || []),
  ];
  coreQuality.failReasons = [...new Set(mergedFailReasons)];
  if (coreQuality.failReasons.length) {
    coreQuality.pass = false;
  }
  coreQuality.total = Math.min(coreQuality.total ?? CORE_TARGET_SCORE, qualityScore.total ?? 100);
  qualityScore.failReasons = coreQuality.failReasons;
  qualityScore.pass = coreQuality.pass && coreQuality.failReasons.length === 0;

  if (pruned.removedCount > 0) {
    next._meta = {
      ...(next._meta || {}),
      v2OffAxisRemoved: pruned.removedCount,
      v2OffAxisSamples: pruned.removedSamples,
    };
  }
  const styleLabels = labelsForMeta(input);
  const ultimateReview = runFinalSelfReviewUltimate(next, ctx);
  const finalAudit = v4Background.finalAudit;
  const charCount = countBlogBodyCharsWithSpaces(next);
  const sensitive =
    ctx.sensitiveCompliance || resolveSensitiveCompliance(ctx);
  let complianceScan = null;
  if (sensitive.isSensitive) {
    complianceScan = runSensitiveComplianceScan(getBlogFullText(next), sensitive);
  }

  const researchGateOk =
    !requiresV2ResearchGate({ ...input, ...ctx }) || Boolean(input.v2PreWriteVerified);
  if (!researchGateOk) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "v2axis_no_research",
    ];
    coreQuality.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 40);
  }

  const lengthGate = assertBlogLengthTier(input, next);
  const editorGate = corrected.gate || assertEditorPreOutput(next, ctx, input);
  if (!lengthGate.ok) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      ...(lengthGate.reasons || []),
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
  }
  if (!editorGate.ok) {
    for (const r of editorGate.reasons || []) {
      if (!coreQuality.failReasons.includes(r)) {
        coreQuality.failReasons.push(r);
      }
    }
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, editorGate.reviewerScore ?? 78);
    next._meta = {
      ...(next._meta || {}),
      editorPreOutput: editorGate,
    };
  }

  let passOutput =
    researchGateOk &&
    v4Core.ok &&
    noCopy.ok &&
    !outlineLeak.isOutline &&
    !next._meta?.blocked &&
    lengthGate.ok &&
    editorGate.ok &&
    (!complianceScan || complianceScan.pass || !complianceScan.isJunk);

  next = ensureNaverChannelClean(next, input);
  next = applyHumanityFinishPass(next, { ...ctx, input }, "blog");
  const briclogEngine = scoreBriclogEngine(next, { ...ctx, input });
  if (!briclogEngine.ok) {
    for (const r of briclogEngine.issues || []) {
      if (!coreQuality.failReasons.includes(r)) {
        coreQuality.failReasons.push(r);
      }
    }
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, briclogEngine.total);
  }

  next._meta = finalizePipelineMeta(next, ctx, {
    charCount,
    blogLengthTier: input.blogLengthTier || ctx.blogLengthTier || "medium",
    qualityScore,
    hardValidation,
    noCopy,
    finalAudit,
    ultimateReview,
    passOutput,
    v4Core,
    v4Background,
    humanityScore: v4Core.humanityScore,
    searchIntentScore: v4Core.searchIntentScore,
    generationMode: "llm_openai",
    pipelineExtras: {
      titleQuestion: deriveTitleQuestion(
        next.representativeTitle || next.title,
        ctx
      ),
      constitutionV2,
      v2Axis,
    },
  });

  next._meta.llmGenerated = true;
  next._meta.isBriefOnly = false;
  next._meta.coreQuality = coreQuality;
  next._meta.briclogEngine = briclogEngine;
  next._meta.personaLabel = styleLabels.persona;
  next._meta.emotionToneLabel = styleLabels.emotionTone;
  next._meta.writingToneLabel = styleLabels.writingTone;
  next._meta.skillLevelLabel = styleLabels.skillLevel;
  if (sensitive.isSensitive) {
    next._meta.sensitiveCompliance = sensitive;
    next._meta.complianceScanPass = complianceScan?.pass ?? true;
    next._meta.complianceWarnings = complianceScan?.warnings || [];
    next._meta.complianceUserBanner = complianceScan?.userBanner || sensitive.userBadge;
    next._meta.sensitiveIndustry = true;
  }

  next = sanitizeBlogPackMetaLayer(next);
  next = finishBlogPackLocal(next, ctx, input);

  const hb = next._meta?.humanBelief;
  if (hb?.failReasons?.length) {
    for (const r of hb.failReasons) {
      if (!coreQuality.failReasons.includes(r)) coreQuality.failReasons.push(r);
    }
    if (hb.ok === false || !hb.score || hb.score < HUMAN_BELIEF_MIN_SCORE) {
      coreQuality.pass = false;
      qualityScore.pass = false;
      qualityScore.total = Math.min(qualityScore.total, hb.score ?? 72);
    }
  }

  passOutput = resolvePassOutputAfterHumanityPass(next, input, passOutput);
  if (!passOutput) {
    const fd = next._meta?.contentQuality?.issues?.[0]?.type || "first_delivery_human_editor";
    if (!coreQuality.failReasons.includes(fd)) coreQuality.failReasons.push(fd);
    coreQuality.pass = false;
    qualityScore.pass = false;
  }
  next._meta = {
    ...next._meta,
    passOutput,
    displayReady: passOutput,
    firstDeliveryReady: passOutput,
  };

  return {
    pack: next,
    passOutput,
    charCount,
    fullText: getBlogFullText(next),
    audit: {
      ...finalAudit,
      blockers: [
        ...new Set([
          ...(v4Core.blockers || []),
          ...(finalAudit.blockers || []),
        ]),
      ],
    },
    sensitiveCompliance: sensitive,
    complianceScan,
  };
}
