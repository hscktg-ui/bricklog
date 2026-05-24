import { getArticleTypeModifier } from "@/lib/prompts/articleTypeModifiers";
import { resolveBrandIndustryContext } from "@/lib/brand/brandContext";
import { buildChannel } from "@/lib/prompts/channels";
import { buildChannelBrief } from "@/lib/prompts/engine/channelBriefs";
import { buildAllChannels, CHANNEL_SPECS } from "@/lib/prompts/channels";
import { parseList } from "@/lib/prompts/engine/textUtils";
import { sanitizeText, parsePhraseList } from "@/utils/sanitizeInput";
import {
  getArticleTypeKeyFromPurpose,
  getPurposeModifier,
} from "@/lib/prompts/purposes";
import { getToneModifier } from "@/lib/prompts/tones";
import { getOpenAISystemPrompt } from "@/lib/prompts/openaiSchema";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import {
  buildSearchSummary,
  buildSearchSummaryBrief,
} from "@/lib/research/searchSummaryBuilder";
import { resolveKpiFromInput } from "@/lib/kpi/contentGoals";
import { CONTENT_OBJECTIVE_OPTIONS } from "@/lib/constants";
import { buildLocationIntel } from "@/lib/location/locationIntelligence";
import {
  runKeywordIntelligence,
  keywordBriefForPrompt,
} from "@/lib/keywords/keywordIntelligence";
import { buildTopicSeoBrief } from "@/lib/seo/topicSeoBrief";
import { getBrandLearningBrief } from "@/lib/learning/brandLearning";
import { getExposureBrief } from "@/lib/platforms/exposureHints";
import { getTrendHintsForChannel } from "@/lib/trends/trendIntelligence";
import { getIndustryDNABrief } from "@/lib/prompts/industryDNA";
import { assemblePromptLayers, layersToBrief } from "@/lib/prompts/promptLayers";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import { getPersonaBlogModifiers } from "@/lib/persona/personaChannelStyle";

/**
 * Prompt Matrix → 통합 컨텍스트
 * @param {Object} input
 */
export function createPromptContext(input) {
  const resolved = resolveBrandIndustryContext(input);
  const businessType = input.businessType || resolved.businessType;
  const industry = resolved.industryValue;
  const flavor = resolved.flavor;
  const subList = parseList(input.subKeyword || "");
  const subLine =
    subList.length > 0
      ? subList.join(", ")
      : (input.subKeyword || "").trim() || "추천";

  const objectiveOpt = CONTENT_OBJECTIVE_OPTIONS.find(
    (o) => o.value === input.contentObjective
  );
  const kpi = objectiveOpt
    ? resolveKpiFromInput({ kpiGoal: objectiveOpt.kpiGoal })
    : resolveKpiFromInput(input);
  const purposeType =
    input.purposeType || input.purpose || kpi.purpose || "season";
  const toneKey = input.tone || kpi.tone || "emotional";
  const articleTypeKey =
    input.articleType ||
    getArticleTypeKeyFromPurpose(purposeType);

  const region =
    sanitizeText(input.region) ||
    (flavor.label ? `${flavor.label} 인근` : "서울");
  const main =
    sanitizeText(input.mainKeyword) ||
    (region ? `${region} ${flavor.label}` : flavor.label);
  const brandName = sanitizeText(input.brandName);
  const includeList = parsePhraseList(input.includePhrases);
  const excludeList = parsePhraseList(input.excludePhrases);

  const locationIntel = buildLocationIntel(input);
  const competitors = parsePhraseList(input.competitors || "");

  const ctx = {
    businessType,
    brandType: resolved.brandType,
    industryText: resolved.industryText,
    industryKey: flavor.industryKey,
    legacyIndustryKey: flavor.legacyKey,
    industryLabel: resolved.industryLabel,
    sensitiveCompliance: resolved.sensitiveCompliance,
    flavor,
    region,
    main,
    subLine,
    subList,
    subKeyword: input.subKeyword || "",
    brandName,
    storeFeatures:
      sanitizeText(input.storeFeatures) ||
      (includeList[0] ? includeList[0] : null),
    products: sanitizeText(input.products) || flavor.productWord,
    benefit: sanitizeText(input.benefit) || "",
    targetCustomer:
      sanitizeText(input.targetCustomer) || "동네와 근교 방문 고객",
    includePhrases: includeList.join(", "),
    excludePhrases: excludeList.join(", "),
    includeList,
    excludeList,
    purposeType,
    purposeDetail:
      (input.purposeDetail || "").trim() ||
      getPurposeModifier(purposeType).label,
    articleTypeKey,
    toneKey,
    purpose: getPurposeModifier(purposeType),
    articleType: getArticleTypeModifier(articleTypeKey),
    tone: getToneModifier(toneKey),
    channelSpecs: CHANNEL_SPECS,
    kpiGoal: objectiveOpt?.kpiGoal || input.kpiGoal || kpi.id,
    kpi,
    contentObjective: input.contentObjective || "save",
    locationIntel,
    areaSeo: locationIntel.areaSeo?.join(", ") || "",
    competitors,
    competitorBrief: competitors.length
      ? `경쟁 브랜드 참고(표현·문장 복사 금지, 차별 인사이트만): ${competitors.join(", ")}`
      : "",
    brandMemory: input.brandMemory || null,
    emojiDensity:
      input.emojiDensity ||
      input.brandMemory?.emojiDensity ||
      input.brandMemory?.emojiLevel ||
      "low",
    blogLengthTier: input.blogLengthTier || "medium",
    placePostType: input.placePostType || "general",
    placeGoal: input.placeGoal || "visit",
    placeHeadline: sanitizeText(input.placeHeadline) || "",
    placeDetailHint: sanitizeText(input.placeDetailHint) || "",
    placeKeyFacts:
      sanitizeText(input.placeKeyFacts) ||
      sanitizeText(input.placeDetailHint) ||
      "",
    placePeriod: sanitizeText(input.placePeriod) || "",
    placeOffer: sanitizeText(input.placeOffer) || "",
    placeCtaType: input.placeCtaType || "visit",
    placeCtaNote: sanitizeText(input.placeCtaNote) || "",
    placeTone: input.placeTone || "informative",
    placeToneKey: input.placeTone || input.tone || "informative",
    instaFormat: input.instaFormat || "feed",
    instaCampaignGoal: input.instaCampaignGoal || "save",
    instaHookAngle: input.instaHookAngle || "emotional",
    instaScene: sanitizeText(input.instaScene) || "",
    instaCta: sanitizeText(input.instaCta) || "",
    instaAudience: input.instaAudience || "local",
    instaExcludePhrases: sanitizeText(input.instaExcludePhrases) || "",
    instaHashtagCount:
      input.instaHashtagCount != null ? Number(input.instaHashtagCount) : 5,
    instaHashtagMode: input.instaHashtagMode || "auto",
    instaManualHashtags: sanitizeText(input.instaManualHashtags) || "",
    instaBodyLength: input.instaBodyLength || "medium",
    instaEmojiLevel: input.instaEmojiLevel || "balanced",
    exposureBlog: getExposureBrief("blog"),
    exposurePlace: getExposureBrief("place"),
    exposureInstagram: getExposureBrief("instagram"),
    trendHintsBlog: getTrendHintsForChannel("blog", input.brandId, flavor.industryKey).join(" · "),
    trendHintsPlace: getTrendHintsForChannel("place", input.brandId, flavor.industryKey).join(" · "),
    trendHintsInstagram: getTrendHintsForChannel("instagram", input.brandId, flavor.industryKey).join(" · "),
  };

  ctx.channelBriefs = {
    blog: buildChannelBrief("blog", ctx),
    smartplace: buildChannelBrief("smartplace", ctx),
    instagram: buildChannelBrief("instagram", ctx),
    hashtag: buildChannelBrief("hashtag", ctx),
    image: buildChannelBrief("image", ctx),
  };

  ctx.brandResearch = runBrandResearchEngine({
    ...input,
    brandName: ctx.brandName,
    region: ctx.region,
    industryLabel: ctx.industryLabel,
    industryKey: ctx.industryKey,
    mainKeyword: ctx.main,
    subKeyword: ctx.subLine,
    includeList: ctx.includeList,
    excludeList: ctx.excludeList,
    brandDescription:
      sanitizeText(input.brandDescription) || ctx.storeFeatures,
    purposeType: ctx.purposeType,
  });
  ctx.searchSummary = buildSearchSummary(ctx.brandResearch);
  ctx.searchSummaryBrief = buildSearchSummaryBrief(ctx.brandResearch);
  if (input.researchBrief?.trim()) {
    ctx.userResearchBrief = input.researchBrief.trim();
    ctx.searchSummaryBrief = [ctx.searchSummaryBrief, input.researchBrief.trim()]
      .filter(Boolean)
      .join("\n\n");
  }
  if (input.researchPayload) {
    ctx.researchPayload = input.researchPayload;
  }
  ctx.industryDNA = getIndustryDNABrief(ctx.industryKey);
  ctx.keywordIntel = runKeywordIntelligence({
    region: ctx.region,
    brandName: ctx.brandName,
    topic: input.topic || ctx.main,
    mainKeyword: ctx.main,
    industry: ctx.industryKey,
    contentDate: input.contentDate,
  });
  if (ctx.keywordIntel?.recommendedMain && !input.mainKeyword?.trim()) {
    ctx.main = ctx.keywordIntel.recommendedMain;
  }
  ctx.keywordBrief = keywordBriefForPrompt(ctx.keywordIntel);
  ctx.topicSeoBrief = buildTopicSeoBrief(ctx);
  ctx.brandLearningBrief = getBrandLearningBrief(input.brandMemory);

  ctx.matrixSummary = [
    `비즈니스 유형: ${businessType}`,
    `세부 업종: ${flavor.matrixHint}`,
    `목적: ${ctx.purpose.label}`,
    `톤: ${ctx.tone.label}`,
    `지역: ${ctx.region}`,
    `메인: ${ctx.main}`,
    `브랜드: ${ctx.brandName}`,
    `조사: ${ctx.brandResearch.sourceStatus}`,
  ].join(" · ");

  if (ctx.brandLearningBrief) {
    ctx.matrixSummary += ` · 학습: ${ctx.brandLearningBrief}`;
  }
  if (input.brandFeedbackBrief) {
    ctx.brandFeedbackBrief = input.brandFeedbackBrief;
    ctx.matrixSummary += ` · 피드백학습: ${input.brandFeedbackBrief}`;
  }
  if (input.brandHabitsBrief) {
    ctx.brandHabitsBrief = input.brandHabitsBrief;
    ctx.matrixSummary += ` · 브랜드습관: ${input.brandHabitsBrief}`;
  }
  if (input.accountBrief) {
    ctx.accountBrief = input.accountBrief;
    ctx.matrixSummary += ` · 운영맥락: ${String(input.accountBrief).slice(0, 160)}`;
  }
  if (input.userWritingBrief) {
    ctx.userWritingBrief = input.userWritingBrief;
    ctx.matrixSummary += ` · 계정습관: ${input.userWritingBrief}`;
  }
  if (input.styleContinuityBrief) {
    ctx.styleContinuityBrief = input.styleContinuityBrief;
    ctx.matrixSummary += ` · 톤유지: ${String(input.styleContinuityBrief).slice(0, 200)}`;
  }
  if (input.personalizationAddon || input.combinedPersonalizationAddon) {
    ctx.personalizationAddon =
      input.personalizationAddon || input.combinedPersonalizationAddon;
    ctx.combinedPersonalizationAddon = ctx.personalizationAddon;
  }
  if (input.brandKnowledgeBrief) {
    ctx.brandKnowledgeBrief = input.brandKnowledgeBrief;
    ctx.matrixSummary += ` · ${String(input.brandKnowledgeBrief).slice(0, 800)}`;
  }
  if (ctx.keywordBrief) {
    ctx.matrixSummary += ` · ${ctx.keywordBrief}`;
  }

  ctx.promptLayers = assemblePromptLayers(ctx, "blog");
  ctx.promptBrief = layersToBrief(ctx.promptLayers);

  const personaResolved = resolveContentPersona({
    contentPersona: input.contentPersona,
    contentPersonaSubtype: input.contentPersonaSubtype,
    topic: input.topic,
    purposeType: ctx.purposeType,
    purpose: input.purpose,
    includePhrases: ctx.includePhrases,
    mainKeyword: ctx.main,
    region: ctx.region,
    brandName: ctx.brandName,
    contentObjective: ctx.contentObjective,
    brandDescription: input.brandDescription,
    storeFeatures: ctx.storeFeatures,
  });
  ctx.contentPersona = personaResolved.persona;
  ctx.contentPersonaSubtype = personaResolved.subtype;
  ctx.contentPersonaLabel = personaResolved.label;
  ctx.contentPersonaSource = personaResolved.source;
  ctx.personaModifiers = getPersonaBlogModifiers(
    personaResolved.persona,
    personaResolved.subtype,
    ctx
  );

  ctx.speechStyle = input.speechStyle || "friendly_blog";
  ctx.proficiency = input.proficiency || "editor_pro";
  ctx.input = {
    ...input,
    v4Speaker: input.v4Speaker,
    emotionTemperature: input.emotionTemperature,
    speechStyle: ctx.speechStyle,
    proficiency: ctx.proficiency,
  };

  if (input.canonicalBrief || input._canonicalBrief) {
    ctx.canonicalBrief = input.canonicalBrief || input._canonicalBrief;
    ctx.inputGrounding = input.inputGrounding || input._inputGrounding;
    ctx.topicAnchor = input.topicAnchor || input._topicAnchor;
    if (input._inputGrounding?.primaryStory) {
      ctx.topic = ctx.topic || input._inputGrounding.primaryStory;
      ctx.contentThesis = ctx.contentThesis || input._inputGrounding.primaryStory;
    }
  }

  return ctx;
}

/**
 * @deprecated LLM First — 클라이언트/동기 호출 금지. generateBlogWithLLMFirst 사용.
 */
export function buildBlogContent(input) {
  throw new Error(
    "SYNC_BLOG_DISABLED: /api/content/blog (generateBlogWithLLMFirst) 를 사용하세요."
  );
}

/** 채널별 최종 생성 (Mock / OpenAI 공통 데이터) */
export function buildAllContent(input) {
  const ctx = createPromptContext(input);
  const packs = buildAllChannels(ctx);

  return {
    ...packs,
    _meta: {
      engine: "BRICLOG Prompt Engine v4 · Local Content Matrix",
      matrixSummary: ctx.matrixSummary,
      businessType: ctx.businessType,
      industryKey: ctx.industryKey,
      purpose: ctx.purpose.label,
      tone: ctx.tone.label,
      blogCharCount: packs.blog?._meta?.charCount,
      mainKeywordUses: packs.blog?._meta?.mainKeywordUses,
      placeDetailChars: packs.smartplace?._meta?.detailChars,
      instaBodyChars: packs.insta?._meta?.bodyChars,
      hashtagTotal: packs.hashtag?._meta?.total,
    },
    _prompt: {
      system: getOpenAISystemPrompt(ctx),
      matrix: ctx.matrixSummary,
      channels: ctx.channelBriefs,
    },
  };
}

export function buildOpenAIPayload(input) {
  const ctx = createPromptContext(input);
  return {
    context: ctx,
    system: getOpenAISystemPrompt(ctx),
    schemaVersion: "v4",
  };
}

export { flattenHashtagPack } from "@/lib/prompts/engine/hashtagEngine";
