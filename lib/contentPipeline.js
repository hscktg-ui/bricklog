/**
 * BRICLOG Content Pipeline
 * blogContent → placeContent → instagramContent → imagePrompts
 */

import { createPromptContext, buildBlogContent } from "@/utils/promptBuilder";
import { buildConstitutionChannelBrief } from "@/lib/constitution/writingConstitutionV2";
import { blogTextFingerprint } from "@/lib/content/channelIsolation";
import { mergeDerivationIntoInsights } from "@/lib/content/blogDerive";
import { buildPlaceFromBlog } from "@/styles/channels/placeStyle";
import { buildInstagramFromBlog } from "@/styles/channels/instagramStyle";
import { buildImagePromptPack } from "@/lib/prompts/engine/imageEngine";
import { getToneModifier } from "@/lib/prompts/tones";
import { getPurposeModifier } from "@/lib/prompts/purposes";
import { BLOG_PURPOSE_OPTIONS } from "@/lib/constants";
import { formatImageFullCopy } from "@/utils/copyFormatter";
import { resolveIndustryFromFreeText } from "@/lib/simpleIndustry";
import { getBrandTypeOption } from "@/lib/brand/brandType";
import {
  resolveImageRatioForPurpose,
  IMAGE_PURPOSE_RATIO_LABEL,
} from "@/lib/images/imagePurposeConfig";
import { applyPipelineQualityDefaults } from "@/lib/quality/qualityDefaults";
import { applyWritingSkillToInput } from "@/lib/content/writingSkillLevel";
import { finishChannelPack } from "@/lib/product/channelQualityStack";

const INSTA_TONE_MAP = {
  emotional: "emotional",
  informative: "informative",
  premium: "premium",
  minimal: "minimal",
};

const IMAGE_TONE_MAP = {
  white: "lifestyle",
  premium: "premium",
  emotional: "emotional",
  info: "informative",
};

const IMAGE_PURPOSE_KEY = {
  thumbnail: "thumbnailPrompt",
  place: "placeImagePrompt",
  insta: "instagramCardPrompt",
  banner: "bannerPrompt",
};

export function normalizePipelineInput(formValues) {
  const include = formValues.includePhrases?.trim();
  const base = {
    brandType: formValues.brandType,
    industry: formValues.industry,
    industryText: formValues.industry,
    purposeType: formValues.purpose,
    tone: formValues.tone,
    region: formValues.region,
    mainKeyword: formValues.mainKeyword || formValues.topic,
    subKeyword: formValues.subKeyword,
    brandName: formValues.brandName,
    includePhrases: include,
    excludePhrases: formValues.excludePhrases,
    storeFeatures: formValues.storeFeatures?.trim() || undefined,
    brandDescription:
      formValues.brandDescription?.trim() ||
      formValues.storeFeatures?.trim() ||
      undefined,
    benefit: formValues.benefit,
    kpiGoal: formValues.kpiGoal,
    brandId: formValues.brandId,
    brandMemory: formValues.brandMemory,
    emojiDensity: formValues.emojiDensity,
    address: formValues.address,
    phone: formValues.phone,
    hours: formValues.hours,
    parking: formValues.parking,
    includeAddress: formValues.includeAddress,
    includePhone: formValues.includePhone,
    includeHours: formValues.includeHours,
    includeParking: formValues.includeParking,
    locationBlock: formValues.locationBlock,
    competitors: formValues.competitors,
    contentObjective: formValues.contentObjective,
    contentPerspective: formValues.contentPerspective || "auto",
    topic: formValues.topic,
    contentDate: formValues.contentDate,
    contentPersona: formValues.contentPersona || "auto",
    contentPersonaSubtype: formValues.contentPersonaSubtype || "",
    v4Speaker: formValues.v4Speaker || "auto",
    emotionTemperature: formValues.emotionTemperature || "auto",
    speechStyle: formValues.speechStyle || "friendly_blog",
    proficiency: formValues.proficiency || "general",
    persona: formValues.v4Speaker || formValues.persona || "auto",
    emotionTone: formValues.emotionTemperature || formValues.emotionTone || "auto",
    writingTone: formValues.speechStyle || formValues.writingTone || "friendly_blog",
    skillLevel: formValues.proficiency || formValues.skillLevel || "general",
    userWritingBrief: formValues.userWritingBrief,
    brandFeedbackBrief: formValues.brandFeedbackBrief,
    feedbackHints: formValues.feedbackHints || null,
    feedbackSeed: formValues.feedbackSeed ?? 0,
    rewriteCount: formValues.rewriteCount ?? 0,
    styleContinuityBrief: formValues.styleContinuityBrief,
    brandKnowledgeBrief: formValues.brandKnowledgeBrief,
    personalizationAddon: formValues.personalizationAddon,
    combinedPersonalizationAddon: formValues.combinedPersonalizationAddon,
    channelSourceBrief: formValues.channelSourceBrief,
    sourceChannel: formValues.sourceChannel,
    blogLengthTier: formValues.blogLengthTier || "medium",
    writingSkillLevel:
      formValues.writingSkillLevel ||
      formValues.skillTier ||
      formValues.writingLevel ||
      undefined,
    placePostType: formValues.placePostType || "general",
    placeGoal: formValues.placeGoal || "visit",
    placeHeadline: formValues.placeHeadline,
    placeDetailHint: formValues.placeDetailHint,
    placeKeyFacts: formValues.placeKeyFacts || formValues.placeDetailHint,
    placePeriod: formValues.placePeriod,
    placeOffer: formValues.placeOffer,
    placeCtaType: formValues.placeCtaType || "visit",
    placeCtaNote: formValues.placeCtaNote,
    placeTone: formValues.placeTone || "informative",
    instaFormat: formValues.instaFormat || "feed",
    instaCampaignGoal: formValues.instaCampaignGoal || "save",
    instaHookAngle: formValues.instaHookAngle || "emotional",
    instaScene: formValues.instaScene,
    instaCta: formValues.instaCta,
    instaAudience: formValues.instaAudience || "local",
    instaExcludePhrases:
      formValues.instaExcludePhrases || formValues.excludePhrases,
    instaHashtagCount:
      formValues.instaHashtagCount != null ? formValues.instaHashtagCount : 5,
    instaHashtagMode: formValues.instaHashtagMode || "auto",
    instaManualHashtags: formValues.instaManualHashtags,
    instaBodyLength: formValues.instaBodyLength || "medium",
    instaEmojiLevel: formValues.instaEmojiLevel || "balanced",
    researchEnabled:
      formValues.researchEnabled !== undefined
        ? Boolean(formValues.researchEnabled)
        : undefined,
    researchTypes: formValues.researchTypes || [],
    researchQuery: formValues.researchQuery || "",
    researchBrief: formValues.researchBrief || "",
    researchPayload: formValues.researchPayload || null,
    researchFacts: formValues.researchFacts || [],
    researchFactCount: formValues.researchFactCount,
    factsPrompt: formValues.factsPrompt || "",
    knowledgeMapBrief: formValues.knowledgeMapBrief || "",
    coverageMapBrief: formValues.coverageMapBrief || "",
    knowledgeCoverage: formValues.knowledgeCoverage || null,
    v2AxisRequired: formValues.v2AxisRequired,
    v2PipelineEnforced: formValues.v2PipelineEnforced,
    v2PreWriteVerified: formValues.v2PreWriteVerified,
    v2ResearchReady: formValues.v2ResearchReady,
    v2PreWriteVerification: formValues.v2PreWriteVerification,
    v2ProductName: formValues.v2ProductName,
    v2AxisBrief: formValues.v2AxisBrief,
    regionKeywordHints: formValues.regionKeywordHints,
    channelDeriveExempt: formValues.channelDeriveExempt,
    v3EngineEnforced: formValues.v3EngineEnforced,
    v3PreWriteVerified: formValues.v3PreWriteVerified,
    v3MasterBrief: formValues.v3MasterBrief,
    v3ContentStrategy: formValues.v3ContentStrategy,
    v3SeoStrategy: formValues.v3SeoStrategy,
  };
  return applyWritingSkillToInput(applyPipelineQualityDefaults(base));
}

import { getResearchClientTimeoutMs } from "@/lib/config/briclogFastPipeline";

/** Research Mode — 자료조사 API */
export async function generateResearchAsync(formValues) {
  const input = normalizePipelineInput(formValues);
  const { fetchWithAuth } = await import("@/lib/api/clientAuth");
  return fetchWithAuth("/api/content/research", {
    method: "POST",
    timeoutMs: getResearchClientTimeoutMs(),
    body: JSON.stringify({
      researchQuery: input.researchQuery,
      researchTypes: input.researchTypes,
      researchMode: input.researchMode,
      regionKeywordHints: input.regionKeywordHints,
      brandName: input.brandName,
      region: input.region,
      industry: input.industry,
      mainKeyword: input.mainKeyword,
      topic: input.topic,
      competitors: input.competitors,
      brandDescription: input.brandDescription,
      brandId: input.brandId,
      brandMemory: input.brandMemory,
      clueDiscovery: input.clueDiscovery,
    }),
  });
}

export function blogExcerpt(blog, maxChars = 1200) {
  if (!blog?.sections?.length) return "";
  const text = blog.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");
  const noSpace = text.replace(/\s/g, "");
  if (noSpace.length <= maxChars) return text;
  return text.slice(0, Math.floor(maxChars * 1.15));
}

export function extractBlogInsights(blog) {
  if (!blog) return null;
  const sections = blog.sections || [];
  const first = sections[0];
  const openingLine = first?.body
    ? first.body.split(/[.!?]\s/)[0]?.slice(0, 90)
    : "";
  const keyPoints = sections
    .slice(0, 4)
    .map((s) => s.heading)
    .filter(Boolean);
  const summary = blogExcerpt(blog, 500);
  const emotionalLine =
    blog.conclusion?.split(/[.!?]/)[0]?.trim() ||
    openingLine ||
    blog.title;

  const base = {
    title: blog.title || "",
    titles: blog.titles || [],
    openingLine,
    keyPoints,
    summary,
    emotionalLine,
    hashtags: (blog.hashtags || []).slice(0, 8),
    sectionCount: sections.length,
  };
  return mergeDerivationIntoInsights(base, blog);
}

export function buildBaseContentLabel(formValues, blog) {
  const region = formValues?.region?.trim() || "";
  const main = formValues?.mainKeyword?.trim() || blog?.title || "콘텐츠";
  const purposeLabel =
    BLOG_PURPOSE_OPTIONS.find((p) => p.value === formValues?.purpose)?.label ||
    "블로그";
  const parts = [region, main, purposeLabel].filter(Boolean);
  return `${parts.join(" ")} 블로그 기반`;
}

function industryLabel(ctxOrValue) {
  if (typeof ctxOrValue === "object" && ctxOrValue?.industryLabel) {
    return ctxOrValue.industryLabel;
  }
  const v = String(ctxOrValue || "").trim();
  if (!v) return getBrandTypeOption("other").label;
  const hit = resolveIndustryFromFreeText(v);
  return hit?.industryLabel || v;
}

/** 파생 채널용 — 블로그 요약문을 본문에 넣지 않음 */
export function buildPipelineContext(input, blog, insights) {
  const base = createPromptContext(input);
  const ins = insights || extractBlogInsights(blog);
  const inc = base.includeList || [];

  return {
    ...base,
    storeFeatures: input.storeFeatures?.trim() || inc[0] || base.storeFeatures,
    purposeDetail: base.purposeDetail,
    blogInsights: ins,
    blogTitle: ins?.title || blog?.title || "",
    pipelineSource: "blog",
    _blogFingerprint: blogTextFingerprint(blog),
    constitutionBrief: buildConstitutionChannelBrief("smartplace", base),
    constitutionBriefInsta: buildConstitutionChannelBrief("instagram", base),
    feedbackHints: input.feedbackHints || null,
    feedbackIntentBrief: input.feedbackIntentBrief || null,
    feedbackRegenDirective: input.feedbackRegenDirective || null,
    feedbackSeed: input.feedbackSeed ?? 0,
    userWritingBrief: input.userWritingBrief || null,
    brandFeedbackBrief: input.brandFeedbackBrief || null,
    styleContinuityBrief: input.styleContinuityBrief || null,
    brandKnowledgeBrief: input.brandKnowledgeBrief || null,
    personalizationAddon:
      input.personalizationAddon || input.combinedPersonalizationAddon || null,
    combinedPersonalizationAddon:
      input.combinedPersonalizationAddon || input.personalizationAddon || null,
  };
}

function refineImageFromBlog(pack, ctx, insights, options, baseLabel) {
  const industry = industryLabel(ctx);
  const mood = ctx.flavor?.moodWords?.slice(0, 3).join(", ") || "clean local";
  const kw = [ctx.main, ctx.region, ...(insights?.hashtags || [])]
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");

  const purpose = options?.purpose || "thumbnail";
  const ratio = resolveImageRatioForPurpose(purpose, options?.ratio);
  const headCopy =
    options?.headCopy?.trim() ||
    insights?.title?.trim() ||
    insights?.emotionalLine?.trim() ||
    "";
  const toneNote =
    options?.tone === "white"
      ? "bright white interior, soft daylight"
      : options?.tone === "premium"
        ? "premium minimal, muted green accent"
        : options?.tone === "emotional"
          ? "warm emotional lifestyle"
          : "informative clean layout";

  const headNote = headCopy
    ? ` Headline visual (Korean): "${headCopy.slice(0, 120)}".`
    : "";
  const suffix = `${headNote} Korean local business ${industry}, ${ctx.region}, mood: ${mood}, keywords: ${kw}, ${toneNote}, aspect ratio ${ratio} (${IMAGE_PURPOSE_RATIO_LABEL[purpose] || ratio}), no text overlay, no watermark.`;

  const key = IMAGE_PURPOSE_KEY[purpose] || "thumbnailPrompt";
  const enriched = { ...pack };
  if (enriched[key]) {
    enriched[key] = `${enriched[key]}${suffix}`;
  }
  enriched.fullCopyText = formatImageFullCopy(enriched);
  enriched._meta = {
    ...pack._meta,
    pipeline: "blog-derive",
    sourceBlogTitle: insights?.title,
    baseLabel,
    imagePurpose: purpose,
    imageRatio: ratio,
    imageTone: options?.tone,
    derivedFrom: "blogContent",
  };
  return enriched;
}

/**
 * @deprecated 클라이언트에서 동기 템플릿 생성 금지 — generateBlogPipelineAsync 사용
 */
export function runBlogPipeline(formValues) {
  throw new Error(
    "SYNC_TEMPLATE_DISABLED: /api/content/blog 를 통해 LLM First 생성을 사용하세요."
  );
}

/** LLM First 블로그 생성 (서버 API — 인증 토큰 포함) */
export async function generateBlogPipelineAsync(formValues) {
  const normalized = normalizePipelineInput(formValues);
  const payload = {
    ...formValues,
    ...normalized,
  };
  const { fetchWithAuth } = await import("@/lib/api/clientAuth");
  const data = await fetchWithAuth("/api/content/blog", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 280_000,
  });
  if (data && data.ok === false && !data.blogContent) {
    const err = new Error(data.userMessage || "콘텐츠를 생성하지 못했습니다.");
    err.code = data.mode || "generation_failed";
    err.payload = data;
    throw err;
  }
  return data;
}

/** 시그니처 채널 — place | instagram | image (V2/V3 게이트) */
export async function generateChannelPipelineAsync(channel, formValues) {
  const normalized = normalizePipelineInput(formValues);
  const payload = {
    ...formValues,
    ...normalized,
    channel,
    contentChannel: channel,
  };
  const { fetchWithAuth } = await import("@/lib/api/clientAuth");
  const data = await fetchWithAuth("/api/content/channel", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 280_000,
  });
  const key =
    channel === "place"
      ? "placeContent"
      : channel === "instagram"
        ? "instagramContent"
        : "imagePrompts";
  if (data && data.ok === false && !data[key]) {
    const err = new Error(data.userMessage || "콘텐츠를 생성하지 못했습니다.");
    err.code = data.mode || "generation_failed";
    err.payload = data;
    throw err;
  }
  return data;
}

export function runPlacePipeline(formValues, blogContent, baseLabel) {
  const input = normalizePipelineInput(formValues);
  const insights = extractBlogInsights(blogContent);
  const ctx = buildPipelineContext(input, blogContent, insights);
  const label = baseLabel || buildBaseContentLabel(formValues, blogContent);
  const pack = buildPlaceFromBlog(ctx, insights, label);
  return finishChannelPack("place", pack, {
    input,
    ...ctx,
    insights,
    sourceChannel: "blog",
  });
}

export function runInstagramPipeline(
  formValues,
  blogContent,
  instaToneKey = "emotional",
  baseLabel
) {
  const input = normalizePipelineInput(formValues);
  const insights = extractBlogInsights(blogContent);
  const ctx = buildPipelineContext(input, blogContent, insights);
  const label = baseLabel || buildBaseContentLabel(formValues, blogContent);
  const pack = buildInstagramFromBlog(ctx, insights, instaToneKey, label);
  return finishChannelPack("instagram", pack, {
    input,
    ...ctx,
    insights,
    sourceChannel: "blog",
  });
}

/** 주제·브랜드만으로 이미지/비주얼 프롬프트용 최소 스토리 형태 */
export function buildFormBlogProxy(formValues) {
  const input = normalizePipelineInput(formValues || {});
  const topic =
    input.topic?.trim() ||
    input.mainKeyword?.trim() ||
    input.brandName?.trim() ||
    "비주얼 소재";
  const body = [
    input.brandDescription,
    input.storeFeatures,
    input.benefit,
    input.includePhrases,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    title: topic,
    representativeTitle: topic,
    sections: [{ heading: "주제", body: body || topic }],
    conclusion: "",
    hashtags: [],
    _meta: { generationMode: "standalone", sourceChannel: "form" },
  };
}

/** 폼·주제만으로 비주얼 프롬프트 (다른 채널 없이 단독) */
export function runImageStandalone(formValues, options = {}) {
  const proxy = buildFormBlogProxy(formValues);
  const label = `단독 · ${formValues?.brandName || formValues?.mainKeyword || "비주얼"}`;
  return runImagePipeline(formValues, proxy, options, label);
}

export function runImagePipeline(
  formValues,
  blogContent,
  options = {},
  baseLabel
) {
  const input = normalizePipelineInput(formValues);
  const insights = extractBlogInsights(blogContent);
  const ctx = buildPipelineContext(input, blogContent, insights);
  const toneKey = IMAGE_TONE_MAP[options.tone] || "lifestyle";
  const tone = getToneModifier(toneKey);
  const pack = buildImagePromptPack(ctx, ctx.flavor, tone);
  const label = baseLabel || buildBaseContentLabel(formValues, blogContent);
  return refineImageFromBlog(pack, ctx, insights, options, label);
}

export function toGenerationRecord(state) {
  const form = state.blogInput || {};
  const purposeMod = getPurposeModifier(form.purpose);
  const toneMod = getToneModifier(form.tone);
  return {
    id: state.recordId || null,
    createdAt: state.createdAt || new Date().toISOString(),
    brand: form.brandName?.trim() || "",
    industry: form.industry,
    region: form.region?.trim() || "",
    keywords: {
      main: form.mainKeyword?.trim() || "",
      sub: form.subKeyword?.trim() || "",
    },
    blog: state.blogContent,
    place: state.placeContent,
    instagram: state.instagramContent,
    imagePrompts: state.imagePrompts,
    baseContentLabel: state.baseContentLabel,
    meta: {
      purpose: purposeMod.label,
      tone: toneMod.label,
    },
  };
}

export function generatePlaceFromBlog(input, blog, baseLabel) {
  return runPlacePipeline(inputToForm(input), blog, baseLabel);
}

export function generateInstaFromBlog(input, blog, instaTone, baseLabel) {
  return runInstagramPipeline(inputToForm(input), blog, instaTone, baseLabel);
}

export function generateImageFromBlog(input, blog, options, baseLabel) {
  return runImagePipeline(inputToForm(input), blog, options, baseLabel);
}

function inputToForm(input) {
  return {
    industry: input.industry,
    purpose: input.purposeType || input.purpose,
    tone: input.tone,
    region: input.region,
    mainKeyword: input.mainKeyword,
    subKeyword: input.subKeyword,
    brandName: input.brandName,
    includePhrases: input.includePhrases,
    excludePhrases: input.excludePhrases,
    storeFeatures: input.storeFeatures,
    benefit: input.benefit,
  };
}

export function blogSummaryOneLine(blog) {
  if (!blog?.title) return "블로그 본문이 없습니다.";
  const chars =
    blog._meta?.charCount ??
    blog.sections?.reduce(
      (n, s) => n + (s.body?.replace(/\s/g, "")?.length || 0),
      0
    );
  return `${blog.title} · ${Number(chars).toLocaleString()}자`;
}
