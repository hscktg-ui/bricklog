/**
 * BRICLOG Ultimate Content Engine — 생성 전 오케스트레이션
 */
import { normalizePipelineInput } from "@/lib/pipeline/v2/inputNormalization";
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import { getLockedIndustryKey } from "@/lib/pipeline/v2/industryLock";
import { buildBrandContext, brandContextBrief } from "@/lib/pipeline/v2/brandContextBuilder";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import { getPersonaBlogModifiers } from "@/lib/persona/personaChannelStyle";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { BLOG_STYLE_HINTS } from "@/lib/prompts/examples/blogExamples";
import { analyzeUserInput } from "./inputUnderstanding";
import { generateBrandProfile, shouldRunBrandResearch } from "./brandProfile";
import { deriveMetaStrategy } from "@/lib/content/metaStrategyEngine";
import { resolveContentPerspective } from "@/lib/content/perspectiveEngine";

function attachPersona(profile, ctx) {
  const resolved = resolveContentPersona({
    contentPersona: ctx.contentPersona,
    contentPersonaSubtype: ctx.contentPersonaSubtype,
    topic: profile.topic,
    purposeType: profile.purposeType,
    purpose: ctx.purpose,
    includePhrases: profile.includeList?.join(", "),
    mainKeyword: profile.mainKeyword,
    region: profile.region,
    brandName: profile.brandName,
    contentObjective: ctx.contentObjective,
    brandDescription: profile.brandDescription,
    storeFeatures: profile.storeFeatures,
  });
  return {
    contentPersona: resolved.persona,
    contentPersonaSubtype: resolved.subtype,
    contentPersonaLabel: resolved.label,
    contentPersonaSource: resolved.source,
    personaModifiers: getPersonaBlogModifiers(
      resolved.persona,
      resolved.subtype,
      { ...ctx, brandName: profile.brandName }
    ),
  };
}

function shouldUseSeasonContext(ctx = {}, profile = {}, metaStrategy = null) {
  const purpose = String(
    ctx.contentObjective || ctx.purpose || profile.purpose || ""
  ).toLowerCase();
  const tone = String(ctx.tone || ctx.input?.tone || "").toLowerCase();
  const industry = String(
    profile.industryLabel || ctx.industryLabel || ctx.industry || ""
  ).toLowerCase();
  const businessPractical = /saas|ai|platform|플랫폼|academy|교육|마케팅|병원/.test(
    industry
  );
  if (businessPractical) return false;
  if (/season|시즌/.test(purpose)) return true;
  if (/emotional|감성/.test(tone)) return true;
  if (metaStrategy?.tone === "감성형") return true;
  return false;
}

/**
 * Ultimate prepare — V2 + 조사 + 프로파일 + 시즌 + 브랜드 메모리
 */
export function prepareUltimateBlogContext(ctx = {}) {
  const understanding = analyzeUserInput(ctx);
  if (!understanding.ready) {
    return {
      ok: false,
      reason: "insufficient_input",
      understanding,
      ctx: null,
    };
  }

  const normalized = normalizePipelineInput({
    ...ctx,
    brandName: understanding.understood.brand || ctx.brandName,
    region: understanding.understood.region || ctx.region,
    industry: understanding.understood.industryKey || ctx.industry,
    topic: understanding.understood.topic || ctx.topic,
    mainKeyword: understanding.understood.mainKeyword || ctx.mainKeyword,
  });

  if (!normalized.ready) {
    return { ok: false, reason: "normalize_failed", understanding, ctx: null };
  }

  const metaStrategy = deriveMetaStrategy({
    ...ctx,
    ...normalized.profile,
    topic: normalized.profile.topic,
    mainKeyword: normalized.profile.mainKeyword,
  });
  if (!metaStrategy.ok) {
    return { ok: false, reason: "meta_strategy_unresolved", understanding, ctx: null };
  }

  const { profile, writingSubject, rawFragments } = normalized;
  const brandMemory = ctx.brandMemory || null;

  const brandBundle = generateBrandProfile(
    { ...ctx, ...profile },
    understanding.understood,
    brandMemory
  );

  const season = getActiveSeasonContext(
    ctx.contentDate ? new Date(ctx.contentDate) : new Date()
  );
  const intent = detectContentIntent({ ...profile, writingSubject }, ctx);
  if (!intent.ok) {
    return { ok: false, reason: "intent_not_locked", understanding, ctx: null };
  }

  const persona = attachPersona(profile, ctx);
  const perspective = resolveContentPerspective({
    contentPerspective: ctx.contentPerspective || ctx.input?.contentPerspective,
    purposeType: profile.purposeType || ctx.purposeType,
    purpose: ctx.purpose || ctx.input?.purpose,
    contentObjective: ctx.contentObjective || ctx.input?.contentObjective,
    tone: ctx.tone || ctx.input?.tone || ctx.toneKey,
    topic: profile.topic,
    mainKeyword: profile.mainKeyword,
    includePhrases: profile.includeList?.join(", "),
    competitors: ctx.competitors || ctx.input?.competitors,
    brandName: profile.brandName,
    region: profile.region,
  });
  const industryLock = getLockedIndustryKey(profile, ctx.industryKey);

  const brandContext = buildBrandContext(profile, {
    ...ctx,
    brandResearch: brandBundle.brandResearch,
    brandProfile: brandBundle.profile,
  });

  const profileItems = Object.entries(brandBundle.profile)
    .filter(([, v]) => v)
    .map(([key, value]) => ({ key, label: key, value, source: "profile" }));

  const pipeline = {
    version: "ultimate",
    understanding,
    brandProfile: brandBundle.profile,
    brandResearch: brandBundle.brandResearch,
    season,
    normalized,
    profile,
    intent,
    persona,
    industryLock,
    brandContext,
    brandContextBrief: brandContextBrief(brandContext),
    writingSubject,
    rawFragments,
    stepsCompleted: ["0", "research", "profile", "1", "2", "3", "4"],
    metaStrategy,
    seasonEnabled: shouldUseSeasonContext(ctx, profile, metaStrategy),
  };

  const enriched = {
    ...ctx,
    brandName: profile.brandName || null,
    region: profile.region || null,
    industryKey: industryLock,
    industryLabel: profile.industryLabel || brandBundle.profile.industry || ctx.industryLabel,
    topic: profile.topic,
    main: profile.mainKeyword || writingSubject,
    mainKeyword: profile.mainKeyword,
    writingSubject,
    emotion: understanding.understood.emotion,
    subList: profile.subList,
    includeList: profile.includeList,
    excludeList: profile.excludeList,
    storeFeatures: profile.storeFeatures || brandBundle.profile.operationStyle,
    brandDescription: profile.brandDescription || brandMemory?.brandDescription,
    benefit: profile.benefit,
    purposeType: profile.purposeType || ctx.purposeType,
    contentPersona: persona.contentPersona,
    contentPersonaSubtype: persona.contentPersonaSubtype,
    contentPersonaLabel: persona.contentPersonaLabel,
    contentPersonaSource: persona.contentPersonaSource,
    personaModifiers: persona.personaModifiers,
    contentPerspective: perspective.perspective,
    contentPerspectiveLabel: perspective.label,
    contentPerspectiveSource: perspective.source,
    brandResearch: brandBundle.brandResearch,
    brandProfile: brandBundle.profile,
    brandContextItems: [
      ...brandContext.items,
      ...profileItems.slice(0, 4),
    ].slice(0, 10),
    brandContextReady: brandContext.ready || brandBundle.ready,
    brandApprovedContentBrief: ctx.brandApprovedContentBrief || "",
    brandPhilosophyBrief: ctx.brandPhilosophyBrief || "",
    seasonContext: pipeline.seasonEnabled ? season : null,
    includePhrases: [
      profile.includeList?.join(", "),
      pipeline.seasonEnabled ? season.promptLine : null,
    ]
      .filter(Boolean)
      .join(" · "),
    contentIntent: {
      ok: true,
      thesis: intent.thesis,
      userIntent: intent.userIntent,
      readerGain: intent.readerOutcome,
      coreTopic: writingSubject,
      locked: intent.locked,
      label: intent.label,
    },
    contentThesis: intent.thesis,
    rawFragments,
    pipeline,
    styleHints: BLOG_STYLE_HINTS,
    canonicalBrief: ctx.canonicalBrief || ctx.input?._canonicalBrief || null,
    inputGrounding: ctx.inputGrounding || ctx.input?._inputGrounding || null,
    intentContract: ctx.intentContract || ctx.input?._intentContract || null,
    topicAnchor: ctx.topicAnchor || ctx.input?._topicAnchor || null,
    metaStrategy,
  };

  return { ok: true, ctx: enriched, pipeline };
}

export function finalizeUltimateMeta(pack, ctx, extra = {}) {
  return {
    ...pack._meta,
    ultimateEngine: true,
    pipeline: {
      ...ctx.pipeline,
      ...extra.pipelineExtras,
      qualityLoop: extra.qualityLoop,
      finalAudit: extra.finalAudit,
      qualityScore: extra.qualityScore,
      hardValidation: extra.hardValidation,
      selfReview: extra.selfReview,
    },
    brandProfile: ctx.brandProfile,
    seasonContext: ctx.seasonContext,
    passOutput: extra.passOutput,
  };
}

/** V2 호환 alias */
export function prepareBlogPipelineV2(ctx) {
  return prepareUltimateBlogContext(ctx);
}
