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
import { injectTitleAnswerHint } from "@/lib/pipeline/v2/titleUnderstanding";
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
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { runSensitiveComplianceScan } from "@/lib/compliance/sensitiveFactCheck";
import {
  scoreCoreContent,
  labelsForMeta,
  CORE_TARGET_SCORE,
} from "@/lib/quality/coreQualityEngine";

export function parseLlmBlogResponse(raw, ctx) {
  const parsed = parseOpenAIJson(raw);
  const blog = parsed?.blog || (parsed?.sections ? parsed : null);
  if (!blog?.sections?.length) return null;
  return normalizeBlogFromAI(blog, ctx);
}

export function postProcessLlmBlog(pack, ctx, input = {}) {
  if (!pack) return null;

  let next = sanitizeBlogPack(pack, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
  });

  next = ensureBrandPresenceInPack(next, ctx);
  next = applyConstitutionToBlogPack(next, ctx);
  next = applyConstitutionV2ToBlogPack(next, ctx);
  next = alignBodyToTitle(next, ctx);
  next = injectTitleAnswerHint(next, ctx);

  next = enrichBlogPack(next, { ...ctx, main: ctx.main }, {
    includePhrases: ctx.includeList?.join(", "),
    includeList: ctx.includeList,
    storeFeatures: ctx.storeFeatures,
    benefit: ctx.benefit,
    brandDescription: ctx.brandDescription,
    excludePhrases: ctx.excludeList?.join(", "),
    industryKey: ctx.industryKey,
  });

  const v4Core = runV4CoreAudit(next, ctx);
  const v4Background = runV4BackgroundAudit(next, ctx, input);
  const hardValidation = v4Core.hard;
  const noCopy = detectNoCopyViolations(next, ctx.brandResearch);
  const constitutionV2 = evaluateWritingConstitutionV2(next, ctx, "blog");
  const coreQuality = scoreCoreContent(next, { ...ctx, input }, "blog");
  const qualityScore = v4Background.qualityScore || { total: 0, breakdown: {} };
  qualityScore.core = coreQuality;
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
  const styleLabels = labelsForMeta(input);
  const ultimateReview = runFinalSelfReviewUltimate(next, ctx);
  const finalAudit = v4Background.finalAudit;
  const charCount = countBlogBodyChars(next);
  const sensitive =
    ctx.sensitiveCompliance || resolveSensitiveCompliance(ctx);
  let complianceScan = null;
  if (sensitive.isSensitive) {
    complianceScan = runSensitiveComplianceScan(getBlogFullText(next), sensitive);
  }

  const passOutput =
    v4Core.ok &&
    noCopy.ok &&
    !next._meta?.blocked &&
    (!complianceScan || complianceScan.pass || !complianceScan.isJunk);

  next._meta = finalizePipelineMeta(next, ctx, {
    charCount,
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
    },
  });

  next._meta.llmGenerated = true;
  next._meta.isBriefOnly = false;
  next._meta.coreQuality = coreQuality;
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
