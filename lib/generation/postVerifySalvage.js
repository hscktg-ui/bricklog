/**
 * 작성 후 검수 실패 시 — 주제 반복 없이 분량·품질 보정 (고객 출력 전)
 */
import { applyBetaTestGuardCorrections } from "@/lib/content/betaTestGuardEngine";
import {
  applyEditorPreOutputCorrection,
} from "@/lib/content/editorPreOutputGate";
import {
  ensureMinBlogSections,
  normalizeBlogLengthAndStructure,
} from "@/lib/content/blogLengthControl";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";

import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { resolveDeliveryFailureMessage } from "@/lib/product/customerOutput";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { isLengthPaddingForbidden, isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { applySpeakerVoiceLockPack } from "@/lib/persona/speakerVoiceLock";
import {
  ensureVerbatimTopicCompliance,
  sanitizeVerbatimTopicInPack,
} from "@/lib/content/informationUnitEngine";
import {
  assessCompletionReadiness,
  isPreviewWithholdFailure,
  countPreviewableSections,
} from "@/lib/product/completionStandard";
import {
  hasFilledBlogAxes,
  isSoftInformationGateFailure,
  stampCompleteCustomerDelivery,
} from "@/lib/product/deliverySoftPass";
import {
  finalizeContentQualityForDelivery,
  isCustomerPreviewDeliverablePack,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";
import { shouldWithholdHumanWritingPack } from "@/lib/product/humanWritingDeliveryGate";
import { applyVisitReviewTopicPackGate } from "@/lib/content/visitReviewTopicGate";
import { isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import {
  applyBrandContentEngine,
  applyBrandContentTitles,
  humanizeSectionHeading,
  isMechanicalSectionHeading,
} from "@/lib/content/brandContentEngine";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { normalizeHeadingKey } from "@/lib/content/knowledgeCoverageEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  scoreInputTopicDominance,
  weaveTopicDominanceIntoPack,
} from "@/lib/content/v13ContentGate";
import { smartCompressBlogPack } from "@/lib/content/editorLengthControlEngine";
import { deepenPackForSalvage } from "@/lib/content/blogLengthDeepen";
import {
  applyGpt55PostWriteLightPass,
  applyGpt55SalvageLightPass,
  shouldUseGpt55LightDelivery,
} from "@/lib/product/gpt55LightDelivery";
import {
  applyEditorV95Pass,
  polishEditorV95Delivery,
} from "@/lib/product/briclogEditorEngineV95";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { computeTextSimilarity } from "@/lib/duplicate/contentSimilarity";
import {
  ensureEditorDeliveryStructure,
  sanitizeEditorLeakPack,
} from "@/lib/content/editorQualityEngine";
import { assertEditorPreOutput } from "@/lib/content/editorPreOutputGate";
import { stripAntiSeoPlaceholderLeaks } from "@/lib/product/furnitureExhibitionEngine";
import {
  stripSearchSnippetLeakFromPack,
  weaveVerifiedBrandFactsForPublish,
} from "@/lib/product/brandJournalistDirective";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import { stripIndustryContaminationFromPack } from "@/lib/product/industryContaminationEngine";
import { assertContentQualityForOutput } from "@/lib/product/contentQualityEngine";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";

const IGOSE_CORRUPT_RE = /[가-힣]이곳[가-힣]/g;
const IGOSE_CORRUPT_THRESHOLD = 6;

function countIgoseCorruption(text = "") {
  return (String(text).match(IGOSE_CORRUPT_RE) || []).length;
}

function applyAntiSeoLeakStripToPack(pack, input = {}) {
  const strip = (text) => stripAntiSeoPlaceholderLeaks(text, input);
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: strip(sec.heading || ""),
      body: strip(sec.body || ""),
    })),
    conclusion: pack.conclusion ? strip(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? strip(pack.intro) : pack.intro,
  };
}

function guardIgoseCorruption(pack, ctx, input, tier) {
  let next = collapseMechanicalHookFlood(pack, input);
  let igoseCount = countIgoseCorruption(getBlogFullText(next));
  if (igoseCount > IGOSE_CORRUPT_THRESHOLD) {
    next = applyAntiSeoLeakStripToPack(next, input);
    igoseCount = countIgoseCorruption(getBlogFullText(next));
  }
  if (igoseCount > IGOSE_CORRUPT_THRESHOLD && isBriclogMissionEnforced()) {
    let fallback = buildMissionProseFallbackPack(input);
    if (isVisitReviewTopicInput(input)) {
      fallback = applyVisitReviewTopicPackGate(fallback, input);
    }
    const deliveryTitle = String(
      next.representativeTitle || next.title || fallback.representativeTitle || ""
    ).trim();
    next = {
      ...fallback,
      title: deliveryTitle || fallback.title,
      representativeTitle: deliveryTitle || fallback.representativeTitle,
      titles: deliveryTitle ? [deliveryTitle] : fallback.titles,
      _meta: {
        ...(fallback._meta || {}),
        ...(next._meta || {}),
        igoseCorruptionFallback: true,
        igoseCountBeforeFallback: igoseCount,
      },
    };
  }
  return next;
}

function dedupeSectionHeadings(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  const seen = new Map();
  return {
    ...pack,
    sections: pack.sections.map((sec, index) => {
      let heading = String(sec.heading || "").trim();
      if (isMechanicalSectionHeading(heading, ctx, input)) {
        heading = humanizeSectionHeading(heading, ctx, input, index);
      }
      const key = normalizeHeadingKey(heading);
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count > 0) {
        heading = humanizeSectionHeading(sec.heading, ctx, input, index + count + 1);
      }
      return { ...sec, heading };
    }),
  };
}

function dedupeTitleEchoes(pack, input = {}) {
  const title = String(pack?.title || pack?.representativeTitle || "").trim();
  if (!title || !pack?.sections?.[0]) return pack;

  const isTitleEcho = (line) => {
    const t = String(line || "").trim();
    if (t.replace(/\s/g, "").length < 16) return false;
    if (computeTextSimilarity(t, title) >= 68) return true;
    if (title.length >= 14 && t.includes(title.slice(0, Math.min(16, title.length)))) {
      return true;
    }
    return /후기|솔직/.test(t) && computeTextSimilarity(t, title) >= 52;
  };

  const sections = [...pack.sections];
  const gi = sections[0];
  let body = String(gi.body || "").trim();
  if (title && body.startsWith(title)) {
    body = body.slice(title.length).replace(/^[\s,，—–-]+/, "").trim();
  }
  const sentences = body
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 8);

  const kept = [];
  for (const sentence of sentences) {
    if (isTitleEcho(sentence)) {
      continue;
    }
    kept.push(sentence);
  }
  if (kept.length) {
    sections[0] = { ...gi, body: kept.join("\n\n").trim() };
  }

  const primary = String(pack.representativeTitle || pack.title || "").trim();
  const titles = Array.isArray(pack.titles) ? pack.titles : [];
  const uniqueTitles = primary ? [primary] : [];
  for (const t of titles) {
    const line = String(t || "").trim();
    if (!line || line === primary) continue;
    if (uniqueTitles.some((prev) => computeTextSimilarity(prev, line) >= 68)) continue;
    if (primary && computeTextSimilarity(primary, line) >= 68) continue;
    uniqueTitles.push(line);
    break;
  }

  return {
    ...pack,
    sections,
    title: primary || pack.title,
    representativeTitle: primary || pack.representativeTitle,
    titles: uniqueTitles.length ? uniqueTitles : primary ? [primary] : pack.titles,
  };
}

function salvageDeliveryCleanupPass(pack, ctx, input, tier) {
  const safeTier = tier || resolveBlogLengthTier(input.blogLengthTier || "medium");
  let next = weaveResearchFactsIntoPack(pack, input);
  next = weaveVerifiedBrandFactsForPublish(next, input);
  next = stripIndustryContaminationFromPack(next, input);
  next = stripSearchSnippetLeakFromPack(next, input);
  next = collapseMechanicalHookFlood(next, input);
  next = applyDuplicateKiller(next, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  if (!scoreInputTopicDominance(getBlogFullText(next), { ...ctx, input }, "blog").ok) {
    next = weaveTopicDominanceIntoPack(next, { ...ctx, input });
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
  }
  if (countBlogBodyCharsWithSpaces(next) < safeTier.min) {
    next = deepenPackForSalvage(next, safeTier.min, { ...ctx, input, _salvageForce: true }, input);
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
    next = collapseMechanicalHookFlood(next, input);
  }
  return next;
}

function stampSalvageQualityMeta(pack, ctx, input) {
  const evalInput = input || ctx.input || ctx;
  const cq = assertContentQualityForOutput(pack, evalInput, evalInput);
  const belief = scoreHumanBelief(getBlogFullText(pack), evalInput, pack);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentQuality: cq.contentQuality,
      humanBelief: belief,
    },
  };
}

function applyDeliveryTitleAndOpeningScrub(pack, ctx, input) {
  let next = stripSearchSnippetLeakFromPack(pack, input);
  next = applyBrandContentTitles(next, ctx, input);
  const deliveryTitle = String(next.representativeTitle || next.title || "").trim();
  if (deliveryTitle) {
    next = {
      ...next,
      title: deliveryTitle,
      representativeTitle: deliveryTitle,
      titles: [deliveryTitle],
    };
  }
  next = dedupeTitleEchoes(next, input);
  return next;
}

function finalizeSalvageDeliveryQuality(pack, ctx, input, tier) {
  if (shouldUseGpt55LightDelivery(pack, input)) {
    return applyGpt55SalvageLightPass(pack, input);
  }
  let next = dedupeTitleEchoes(pack, input);
  next = applyDuplicateKiller(next, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = dedupeSectionHeadings(next, ctx, input);
  next = weaveTopicDominanceIntoPack(next, { ...ctx, input });

  let chars = countBlogBodyCharsWithSpaces(next);
  let dup = detectDuplicateKillerIssues(getBlogFullText(next), {
    sameInfoMax: 2,
    similarityPercent: 72,
  });
  if (!dup.ok) {
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
    dup = detectDuplicateKillerIssues(getBlogFullText(next), {
      sameInfoMax: 2,
      similarityPercent: 72,
    });
  }
  if (chars < tier.min) {
    next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
    next = dedupeSectionHeadings(next, ctx, input);
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
    chars = countBlogBodyCharsWithSpaces(next);
    dup = detectDuplicateKillerIssues(getBlogFullText(next), {
      sameInfoMax: 2,
      similarityPercent: 72,
    });
  }

  chars = countBlogBodyCharsWithSpaces(next);
  if (chars < tier.min) {
    next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
    next = dedupeTitleEchoes(next, input);
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  next = ensureMinBlogSections(next, ctx, input);
  next = ensureEditorDeliveryStructure(next, input);
  next = sanitizeEditorLeakPack(next);
  next = applySpeakerVoiceLockPack(next, input);
  next = ensureVerbatimTopicCompliance(next, input, "blog");
  next = applyEditorV95Pass(next, ctx, input);

  if (countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
    next = dedupeTitleEchoes(next, input);
    next = ensureVerbatimTopicCompliance(next, input, "blog");
    next = applyEditorV95Pass(next, ctx, input);
  }

  if ((next.sections || []).length < 3) {
    next = ensureMinBlogSections(next, ctx, input);
    next = ensureEditorDeliveryStructure(next, input);
    if (countBlogBodyCharsWithSpaces(next) < tier.min) {
      next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
    }
  }

  for (let lock = 0; lock < 3; lock += 1) {
    chars = countBlogBodyCharsWithSpaces(next);
    dup = detectDuplicateKillerIssues(getBlogFullText(next), {
      sameInfoMax: 2,
      similarityPercent: 72,
    });
    if (chars >= tier.min && dup.ok) break;
    if (!dup.ok) {
      next = applyDuplicateKiller(next, ctx, "blog");
      next = stripGlobalExactDuplicateSentences(next);
      dup = detectDuplicateKillerIssues(getBlogFullText(next), {
        sameInfoMax: 2,
        similarityPercent: 72,
      });
      if (dup.ok && chars >= tier.min) break;
    }
    if (chars < tier.min) {
      next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
      next = dedupeTitleEchoes(next, input);
      next = applyDuplicateKiller(next, ctx, "blog");
      next = stripGlobalExactDuplicateSentences(next);
      next = ensureMinBlogSections(next, ctx, input);
      next = ensureEditorDeliveryStructure(next, input);
      next = ensureVerbatimTopicCompliance(next, input, "blog");
      next = applyEditorV95Pass(next, ctx, input);
    }
  }

  next = applyDeliveryTitleAndOpeningScrub(next, ctx, input);
  next = ensureVerbatimTopicCompliance(next, input, "blog");
  next = polishEditorV95Delivery(next, ctx, input);

  if (countBlogBodyCharsWithSpaces(next) > tier.max) {
    next = smartCompressBlogPack(next, tier.max, ctx, input);
  }
  next = dedupeTitleEchoes(next, input);
  next = applyDuplicateKiller(next, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = ensureVerbatimTopicCompliance(next, input, "blog");
  if (
    !scoreInputTopicDominance(getBlogFullText(next), { ...ctx, input }, "blog").ok
  ) {
    next = weaveTopicDominanceIntoPack(next, { ...ctx, input });
    next = ensureVerbatimTopicCompliance(next, input, "blog");
  }
  if (countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenPackForSalvage(next, tier.min, { ...ctx, input, _salvageForce: true }, input);
    next = applyDuplicateKiller(next, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
  }
  if (!next._meta?.editorV95Pass) {
    next = polishEditorV95Delivery(next, ctx, input);
  } else {
    next = applyEditorV95Pass(next, ctx, input);
  }

  next = salvageDeliveryCleanupPass(next, ctx, input, tier);
  next = guardIgoseCorruption(next, ctx, input, tier);
  next = applyDeliveryTitleAndOpeningScrub(next, ctx, input);
  next = polishEditorV95Delivery(next, ctx, input);
  next = stampSalvageQualityMeta(next, ctx, input);

  const editorGate = assertEditorPreOutput(next, ctx, input);
  chars = countBlogBodyCharsWithSpaces(next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      salvageDeliveryFinalized: true,
      lengthTierMet: chars >= tier.min,
      postVerifySalvaged: true,
      editorPreOutput: editorGate,
      failReasons: editorGate.ok ? [] : editorGate.reasons,
    },
  };
}

function mergeResearchGroundedWhenShort(pack, input, tier) {
  if (shouldUseGpt55LightDelivery(pack, input)) return pack;
  const before = countBlogBodyCharsWithSpaces(pack);
  if (before >= tier.min || !hasUsableResearchFacts(input)) return pack;

  const grounded = buildResearchGroundedHumanPack({
    ...input,
    blogLengthTier: input.blogLengthTier || tier.key || "medium",
  });
  const after = countBlogBodyCharsWithSpaces(grounded);
  if (after <= before) return pack;

  return {
    ...grounded,
    title: pack.title || grounded.title,
    representativeTitle: pack.representativeTitle || grounded.representativeTitle,
    titles: pack.titles?.length ? pack.titles : grounded.titles,
    _meta: {
      ...grounded._meta,
      ...pack._meta,
      salvageGroundedMerge: true,
      postVerifySalvaged: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} pipelineInput
 */
export function salvageBlogPackForDelivery(pack, pipelineInput = {}) {
  if (!pack?.sections?.length) return pack;

  if (shouldUseGpt55LightDelivery(pack, pipelineInput)) {
    return applyGpt55SalvageLightPass(pack, pipelineInput);
  }

  if (isLlmOriginatedPack(pack)) {
    const ctx = { input: pipelineInput, ...pipelineInput };
    let next = applyDuplicateKiller(pack, ctx, "blog");
    next = stripGlobalExactDuplicateSentences(next);
    next = applyDisplayBodyGuardPack(next, pipelineInput);
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        postVerifySalvaged: true,
        llmSalvageLight: true,
        blocked: false,
      },
    };
  }

  const preWrite = prepareBriclogPreWriteContext(pipelineInput);
  const enriched = {
    ...pipelineInput,
    knowledgeCoverage:
      pipelineInput.knowledgeCoverage || preWrite.knowledgeCoverage,
    informationUnits:
      pipelineInput.informationUnits || preWrite.informationUnits,
  };
  const ctx = { ...enriched, input: enriched };
  const tier = resolveBlogLengthTier(enriched.blogLengthTier || "medium");

  let next = pack;
  if (isBriclogMissionEnforced()) {
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
  }

  next = applyBetaTestGuardCorrections(next, "blog", ctx, enriched);
  next = applyHumanWriterHeadingGate(next, { input: enriched });
  next = applyEditorPreOutputCorrection(next, enriched, enriched).pack;
  next = normalizeBlogLengthAndStructure(next, ctx, enriched).pack;

  let expanded = next;
  const salvageChars = countBlogBodyCharsWithSpaces(next);
  const severelyShort = salvageChars < tier.min;
  if (!isLengthPaddingForbidden() || severelyShort) {
    expanded = expandPackByInformation(next, ctx, enriched, {
      minChars: tier.min,
      channel: "blog",
      salvageForce: severelyShort,
    });
    if (!expanded?._meta?.blocked && !expanded?._meta?.coverageExpansionSkipped) {
      next = expanded;
    }
  }

  const strict = enforceStrictBlogLength(next, enriched, enriched, {
    maxAttempts: 6,
  });
  next = strict.pack;
  next = normalizeBlogLengthAndStructure(next, ctx, enriched).pack;
  next = sanitizeBlogPackMetaLayer(next);
  next = applyEditorialPackGate(next, ctx);
  next = weaveResearchFactsIntoPack(next, enriched);
  next = mergeResearchGroundedWhenShort(next, enriched, tier);
  next = applyDuplicateKiller(next, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = dedupeSectionHeadings(next, ctx, enriched);
  next = applyBrandContentEngine(next, ctx, enriched);
  next = applyHumanWriterHeadingGate(next, { input: enriched });
  if (shouldUseGpt55LightDelivery(next, enriched)) {
    next = applyGpt55PostWriteLightPass(next, enriched);
  } else {
    next = applyHumanityFinishPass(next, ctx, "blog");
    next = ensureMissionProseTierLength(next, { input: enriched });
  }
  next = finalizeSalvageDeliveryQuality(next, ctx, enriched, tier);

  if (
    isBriclogMissionEnforced() &&
    !shouldUseGpt55LightDelivery(next, enriched) &&
    countPreviewableSections(next) < 2 &&
    (next.sections?.length || 0) < 3
  ) {
    let fallback = buildMissionProseFallbackPack(enriched);
    if (isVisitReviewTopicInput(enriched)) {
      fallback = applyVisitReviewTopicPackGate(fallback, enriched);
    }
    next = applyHumanityFinishPass(fallback, ctx, "blog");
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
  }

  if (shouldWithholdHumanWritingPack(next, enriched)) {
    return {
      ...applyDisplayBodyGuardPack(next, enriched),
      _meta: {
        ...(next._meta || {}),
        postVerifySalvaged: true,
        blocked: true,
        humanWritingWithheld: true,
      },
    };
  }

  next = applyDisplayBodyGuardPack(next, enriched);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      postVerifySalvaged: true,
      blocked: false,
      knowledgeExpansionBlocked: undefined,
    },
  };
}

function hasDisplayableSections(pack) {
  return Boolean(pack?.sections?.length);
}

function prepareBlogForUiDelivery(blog, pipelineInput) {
  if (!blog?.sections?.length) return blog;
  const cv = scoreChecklistVoice(
    (blog.sections || []).map((s) => `${s.heading}\n${s.body}`).join("\n\n"),
    blog
  );
  if (!cv.ok) {
    return applyEditorialPackGate(blog, { input: pipelineInput, ...pipelineInput });
  }
  return blog;
}

function shouldWithholdForCompletion(pack, pipelineInput, gate) {
  if (hasDisplayableSections(pack) && countPreviewableSections(pack) >= 2) {
    return isPreviewWithholdFailure(gate, pack, pipelineInput);
  }
  return isPreviewWithholdFailure(gate, pack, pipelineInput);
}

/**
 * 검수 통과 여부와 관계없이 화면에 올릴 수 있는 편집본 결정
 * @returns {{ ok: boolean, pack?: object, preview?: boolean, userMessage?: string|null, gate?: object }}
 */
export function resolveBlogUiDelivery(blog, pipelineInput = {}, result = {}) {
  blog = prepareBlogForUiDelivery(blog, pipelineInput);
  if (!hasDisplayableSections(blog)) {
    return {
      ok: false,
      userMessage:
        result.userMessage ||
        "브랜드 · 지역 · 주제를 입력한 뒤 「조사 후 글 받기」를 눌러 주세요.",
    };
  }

  const serverVerified =
    !result.withheld &&
    (result.meta?.passOutput === true ||
      result.meta?.v2PipelineVerified ||
      blog._meta?.passOutput ||
      blog._meta?.writtenFromVerifiedResearch);

  let gate = serverVerified
    ? { ok: true, pack: blog }
    : assertPostWriteDeliverable(pipelineInput, blog);

  if (
    !gate.ok &&
    isCustomerPreviewDeliverablePack(blog, result) &&
    hasDisplayableSections(blog) &&
    hasFilledBlogAxes(pipelineInput)
  ) {
    const polished = isLlmOriginatedPack(blog, result)
      ? finalizeContentQualityForDelivery(
          ensureBlogDisplayPack(blog, pipelineInput),
          pipelineInput,
          "blog"
        )
      : ensureBlogDisplayPack(blog, pipelineInput);
    const stamped = stampCompleteCustomerDelivery(polished, pipelineInput, {
      failReasons: gate.reasons || gate.failReasons,
      customerPreviewPack: true,
    });
    if (stamped) {
      return {
        ok: true,
        pack: stamped,
        preview: Boolean(blog?._meta?.missionProseFallback),
        userMessage: null,
        gate,
      };
    }
  }

  if (
    !gate.ok &&
    hasDisplayableSections(blog) &&
    hasFilledBlogAxes(pipelineInput) &&
    !shouldWithholdForCompletion(blog, pipelineInput, gate) &&
    !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
  ) {
    const stamped = stampCompleteCustomerDelivery(
      ensureBlogDisplayPack(blog, pipelineInput),
      pipelineInput,
      { failReasons: gate.reasons || gate.failReasons }
    );
    if (stamped) {
      return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
    }
  }

  if (!gate.ok) {
    if (
      hasDisplayableSections(blog) &&
      hasFilledBlogAxes(pipelineInput) &&
      isSoftInformationGateFailure(gate) &&
      !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
    ) {
      const stamped = stampCompleteCustomerDelivery(
        ensureBlogDisplayPack(blog, pipelineInput),
        pipelineInput,
        { failReasons: gate.reasons || gate.failReasons }
      );
      if (stamped) {
        return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
      }
    }

    if (isLlmOriginatedPack(blog) && hasDisplayableSections(blog)) {
      const stamped = stampCompleteCustomerDelivery(
        ensureBlogDisplayPack(blog, pipelineInput),
        pipelineInput,
        { failReasons: gate.reasons || gate.failReasons, llmUiPreserve: true }
      );
      if (stamped) {
        return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
      }
    }

    const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
    gate = assertPostWriteDeliverable(pipelineInput, salvaged);
    if (gate.ok) {
      return {
        ok: true,
        pack: ensureBlogDisplayPack(gate.pack, pipelineInput),
        preview: false,
        gate,
      };
    }
    if (
      hasDisplayableSections(salvaged) &&
      !shouldWithholdHumanWritingPack(salvaged, pipelineInput, gate)
    ) {
      const stamped = stampCompleteCustomerDelivery(
        ensureBlogDisplayPack(salvaged, pipelineInput),
        pipelineInput,
        { failReasons: gate.reasons || gate.failReasons }
      );
      if (stamped) {
        return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
      }
    }
    if (
      hasFilledBlogAxes(pipelineInput) &&
      hasDisplayableSections(blog) &&
      !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
    ) {
      const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
      const packForUi = ensureBlogDisplayPack(salvaged, pipelineInput);
      if (!shouldWithholdHumanWritingPack(packForUi, pipelineInput, gate)) {
        const stamped = stampCompleteCustomerDelivery(packForUi, pipelineInput, {
          uiDeliveryForced: true,
        });
        if (stamped) {
          return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
        }
      }
    }
    const gateMsg =
      gate?.userMessage ||
      (gate?.reasons?.length ? resolveDeliveryFailureMessage(gate) : null);
    return {
      ok: false,
      userMessage:
        gateMsg ||
        result.userMessage ||
        "브랜드 · 지역 · 주제를 입력한 뒤 「조사 후 글 받기」를 눌러 주세요.",
      gate,
    };
  }

  return {
    ok: true,
    pack: ensureBlogDisplayPack(gate.pack, pipelineInput),
    preview: false,
    gate,
  };
}
