/**
 * GPT-5.5 Light Delivery — 조사 → Writer(GPT) → 경량 점검 → 발행 전 화자·최종 마감
 * Mission/Editor/2차 GPT Writer는 fallback·심각 미달 때만.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import {
  isGpt55LlmPack,
  shouldPreserveGpt55LlmPackBody,
} from "@/lib/product/gpt55LlmPackGuard";
import { stripCatalogContaminationFromBlogPack } from "@/lib/product/catalogContaminationGuard";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import { stripContentGateViolationsFromPack } from "@/lib/product/contentGateSystem";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";
import { stripBlogPackHashtags } from "@/lib/content/informationalTopicPackGate";
import { scrubCustomerForbiddenSurfaceInPack } from "@/lib/copy/customerFacing";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import { ensureNaverChannelClean } from "@/lib/content/v17PostProcess";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import { assertNoPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";
import { stampDeliveryGradeMeta } from "@/lib/product/deliveryGrade";
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";

export const GPT55_LIGHT_DELIVERY_VERSION = "gpt55-light-v1";

export function isGpt55LightPathEnabled() {
  return isGpt55WriterDominant();
}

/** GPT-5.5 LLM 원고 — Mission·2차 Writer·카탈로그 패딩 대신 light path */
export function shouldUseGpt55LightDelivery(pack, input = {}) {
  if (!isGpt55LightPathEnabled()) return false;
  return shouldPreserveGpt55LlmPackBody(pack, input) || isGpt55LlmPack(pack, input);
}

/**
 * 2차 Writer Engine — GPT55 light path에서는 기본 스kip (섹션 3개 미만만 rescue 허용)
 */
export function shouldSkipWriterEngineForGpt55(pack, input = {}) {
  if (!shouldUseGpt55LightDelivery(pack, input)) return false;
  if (!pack?.sections?.length) return true;
  const sections = pack.sections?.length || 0;
  return sections >= HUMAN_MIN_SECTIONS;
}

function polishGpt55VoiceField(text = "") {
  return polishNaverBlogVoice(String(text || "").trim());
}

/** 발행 직전 — GPT 원고 화자·말투만 (칼럼 소제목·Mission arc 주입 없음) */
export function applyGpt55VoiceFinalPass(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  if (!options.force && pack._meta?.gpt55VoiceFinalPass) return pack;

  const sections = (pack.sections || []).map((sec) => ({
    ...sec,
    body: polishGpt55VoiceField(sec.body),
    heading: polishGpt55VoiceField(sec.heading),
  }));

  return {
    ...pack,
    sections,
    conclusion: pack.conclusion ? polishGpt55VoiceField(pack.conclusion) : pack.conclusion,
    _meta: {
      ...(pack._meta || {}),
      gpt55VoiceFinalPass: true,
      humanVoiceDeliveryPass: true,
    },
  };
}

/** 중간·발행 전 — 사실·중복·오염만 정리 (본문 재작성·tier 패딩 없음) */
export function applyGpt55PrePublishChecks(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let next = stripCatalogContaminationFromBlogPack(pack);
  next = stripSearchSnippetLeakFromPack(next, input);
  next = stripContentGateViolationsFromPack(next, input);
  next = sanitizeVerbatimTopicInPack(next, input, "blog");
  next = applyDuplicateKiller(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = applyDuplicateKiller(next, { input }, "blog");
  next = sanitizeBlogPackMetaLayer(next);
  next = ensureNaverChannelClean(next, input);
  next = stripBlogPackHashtags(next);
  next = scrubCustomerForbiddenSurfaceInPack(next);
  next = applyDisplayBodyGuardPack(next, input);
  next = collapseMechanicalHookFlood(next, input);
  next = applyGoldenSafeEdit(next, input, {
    forceVoice: "seupnida",
    forceApply: true,
  });
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      gpt55PrePublishChecks: true,
    },
  };
}

/**
 * UI 송출 — finalizeBlogPackForUi 대체 (GPT-5.5 LLM)
 */
export function finalizeGpt55BlogPackForUi(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const inbound = pack;
  let next = applyGpt55PrePublishChecks(pack, input);
  next = applyGpt55VoiceFinalPass(next, input, { force: true });
  next = guardPackAgainstShrink(inbound, next, { stage: "gpt55LightDelivery" });
  next = finalizeContentQualityForDelivery(next, input, "blog", {
    afterWriterEngine: Boolean(next._meta?.briclogWriterEngine),
  });
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      gpt55LightDelivery: true,
      gpt55LightDeliveryVersion: GPT55_LIGHT_DELIVERY_VERSION,
      generationMode:
        next._meta?.generationMode ||
        pack._meta?.generationMode ||
        "llm_gpt55",
    },
  };
}

/**
 * 화면 표시 — ensureBlogDisplayPack 대체 (GPT-5.5 LLM)
 */
export function ensureGpt55BlogDisplayPack(blog, input = {}) {
  if (!blog?.sections?.length) return blog;

  let pack = applyGpt55PrePublishChecks(blog, input);
  pack = applyGpt55VoiceFinalPass(pack, input, { force: true });
  pack = stampDeliveryGradeMeta(pack, input);

  const primaryTitle = String(
    pack.representativeTitle || pack.title || blog.representativeTitle || blog.title || ""
  ).trim();
  if (primaryTitle) {
    pack = {
      ...pack,
      title: primaryTitle,
      representativeTitle: primaryTitle,
      titles: [primaryTitle],
    };
  }

  const placeholderGate = assertNoPlaceholderContamination(pack, input);
  return {
    ...pack,
    fullCopyText: formatBlogFullCopy(pack, {
      includeSubheadings: pack._meta?.includeSubheadings !== false,
    }),
    _meta: {
      ...(pack._meta || {}),
      gpt55LightDisplay: true,
      gpt55LightDeliveryVersion: GPT55_LIGHT_DELIVERY_VERSION,
      displayLightPath: true,
      placeholderContamination: placeholderGate.counts,
      placeholderWithheld: !placeholderGate.ok || undefined,
    },
  };
}

/** postProcessLlmBlog — delivery 전 경량 마감 (finalizeContentQuality는 UI 송출에서 1회) */
export function applyGpt55PostWriteLightPass(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const inbound = pack;
  let next = applyGpt55PrePublishChecks(pack, input);
  next = applyGpt55VoiceFinalPass(next, input, { force: true });
  next = guardPackAgainstShrink(inbound, next, { stage: "gpt55PostWrite" });
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      gpt55PostWriteLight: true,
      gpt55LightDeliveryVersion: GPT55_LIGHT_DELIVERY_VERSION,
    },
  };
}

/** humanityFinishPass 대체 — Mission tier refill 루프 없음 */
export function applyGpt55HumanityLightFinish(pack, ctx = {}, channel = "blog") {
  if (channel !== "blog" || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  const inbound = pack;
  let next = applyGpt55PrePublishChecks(pack, input);
  next = applyGpt55VoiceFinalPass(next, input, { force: true });
  next = guardPackAgainstShrink(inbound, next, { stage: "gpt55HumanityLight" });
  next = finalizeContentQualityForDelivery(next, input, "blog", {
    afterWriterEngine: Boolean(next._meta?.briclogWriterEngine),
  });
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanityFinishPass: {
        applied: true,
        channel: "blog",
        gpt55Light: true,
        beliefScore: next._meta?.humanBeliefScore,
        beliefOk: next._meta?.humanBelief?.ok,
      },
      gpt55LightDelivery: true,
    },
  };
}

/** salvage·postVerify — Mission tier·editor structure 패딩 없이 중복·오염만 정리 */
export function applyGpt55SalvageLightPass(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const ctx = { input, ...input };
  const inbound = pack;
  let next = applyDuplicateKiller(pack, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  if ((next.sections || []).length < HUMAN_MIN_SECTIONS) {
    next = ensureMinBlogSections(next, ctx, input, HUMAN_MIN_SECTIONS);
  }
  next = applyGpt55PrePublishChecks(next, input);
  next = applyGpt55VoiceFinalPass(next, input, { force: true });
  next = applyDisplayBodyGuardPack(next, input);
  next = guardPackAgainstShrink(inbound, next, { stage: "gpt55SalvageLight" });
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      postVerifySalvaged: true,
      gpt55SalvageLight: true,
      llmSalvageLight: true,
      blocked: false,
    },
  };
}

export function scoreGpt55LightDeliveryReadiness(pack, input = {}) {
  const full = getBlogFullText(pack);
  const placeholder = assertNoPlaceholderContamination(pack, input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  return {
    ok: placeholder.ok && (pack.sections?.length || 0) >= HUMAN_MIN_SECTIONS,
    chars,
    tierMin: tier.min,
    placeholderOk: placeholder.ok,
  };
}
