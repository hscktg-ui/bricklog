import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  detectOutlineLeak,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import {
  hasMetaPhilosophyLeak,
  sanitizeBlogPackMetaLayer,
} from "@/lib/content/metaLayerSeparation";
import { assessCompletionReadiness } from "@/lib/product/completionStandard";
import { assessHumanWritingDelivery } from "@/lib/product/humanWritingDeliveryGate";
import {
  finalizeContentQualityForDelivery,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { assertNoPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import {
  applyBrandContentEngine,
  applyBrandContentTitles,
  isMechanicalListingTitle,
} from "@/lib/content/brandContentEngine";
import {
  isNaturalDeliveryTitle,
  titleEchoesTopicTwice,
  titleHasTemplateSpam,
} from "@/lib/content/humanTitleEngine";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  applyDuplicateKiller,
  detectDuplicateKillerIssues,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";
import {
  applyEditorV95Pass,
  assertEditorV95ForOutput,
  polishEditorV95Delivery,
} from "@/lib/product/briclogEditorEngineV95";
import {
  applyHumanGradeFinishingPass,
  ensureEditorDeliveryStructure,
  sanitizeEditorLeakPack,
} from "@/lib/content/editorQualityEngine";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import {
  assessDeliveryGrade,
  stampDeliveryGradeMeta,
} from "@/lib/product/deliveryGrade";
import { stampContentQualityValue } from "@/lib/product/contentQualityValue";
import { isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import { assertEditorPreOutput } from "@/lib/content/editorPreOutputGate";
import {
  detectVerbatimTopicUsage,
  ensureVerbatimTopicCompliance,
  sanitizeVerbatimTopicInPack,
} from "@/lib/content/informationUnitEngine";
import { scoreGiSeungJeonGyeol } from "@/lib/content/editorQualityEngine";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { deepenPackForSalvage } from "@/lib/content/blogLengthDeepen";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import { assessFirstDeliveryQuality } from "@/lib/product/firstDeliveryQuality";
import { assessNoNewFactsForPublish } from "@/lib/product/brandJournalistDirective";
import { scrubCustomerForbiddenSurfaceInPack } from "@/lib/copy/customerFacing";
import { hasSubstantiveLlmBody } from "@/lib/product/contentQualityDelivery";
import {
  ensureGpt55BlogDisplayPack,
  shouldUseGpt55LightDelivery,
} from "@/lib/product/gpt55LightDelivery";
import { assessBriclogResetQualityGate } from "@/lib/product/briclogResetQualityGate";
import {
  isBriclogResetQualityEnforced,
  RESET_QUALITY_WITHHOLD_MESSAGE,
} from "@/lib/config/resetLaunchFlags";

function applyResetQualityDisplayBlock(pack, input = {}, meta = {}) {
  if (!isBriclogResetQualityEnforced()) {
    return { pack, meta };
  }
  if (meta.forcedMissionProseRoute) {
    const resetGate = assessBriclogResetQualityGate(pack, input);
    return {
      pack,
      meta: {
        ...meta,
        resetQualityGate: resetGate,
        resetQualityScore: resetGate.score,
        resetQualityWithheld: false,
        outputWithheld: false,
      },
    };
  }
  const resetGate = assessBriclogResetQualityGate(pack, input);
  if (!resetGate.shouldWithhold) {
    return {
      pack,
      meta: {
        ...meta,
        resetQualityGate: resetGate,
        resetQualityScore: resetGate.score,
      },
    };
  }
  return {
    pack,
    meta: {
      ...meta,
      resetQualityGate: resetGate,
      resetQualityScore: resetGate.score,
      resetQualityWithheld: true,
      displayReady: false,
      publishReady: false,
      completeDraft: false,
      deliveryPreview: false,
      outputWithheld: true,
      failReasons: [
        ...new Set([...(meta.failReasons || []), ...(resetGate.reasons || [])]),
      ],
      resetQualityMessage: resetGate.userMessage || RESET_QUALITY_WITHHOLD_MESSAGE,
      humanWritingDelivery: {
        ...(meta.humanWritingDelivery || {}),
        humanReady: false,
        displayReady: false,
        reasons: [
          ...((meta.humanWritingDelivery || {}).reasons || []).slice(0, 4),
          ...(resetGate.reasons || []).slice(0, 4),
        ],
      },
    },
  };
}

function isCustomerDeliveryRescuePack(blog) {
  const m = blog?._meta || {};
  return Boolean(
    m.deliveryRescue ||
    m.missionProseFallback ||
    m.editorialQualityStandard ||
    m.draftFallback ||
    m.generationMode === "local_delivery_fallback" ||
    m.generationMode === "draft_fallback"
  );
}

function isQualityDeliveredDisplayPack(blog) {
  const m = blog?._meta || {};
  return Boolean(
    m.contentQualityDelivered ||
    m.missionCatalogDelivery ||
    m.salvageDeliveryFinalized
  );
}

/** 송출·미션 카탈로그 완료본 — UI에 즉시 올릴 때 중복 후처리 생략 */
function ensureBlogDisplayPackStampDelivered(blog, input = {}) {
  if (!blog?.sections?.length) return blog;
  let pack = scrubCustomerForbiddenSurfaceInPack(blog);
  pack = applyDisplayBodyGuardPack(pack, input);
  pack = collapseMechanicalHookFlood(pack, input);
  const existing = String(pack.fullCopyText || "").trim();
  const fullCopyText =
    existing.length > 40 &&
    !detectOutlineLeak({ ...pack, fullCopyText: existing }).isOutline &&
    !hasMetaPhilosophyLeak(existing, input)
      ? existing
      : formatBlogFullCopy(pack, {
          includeSubheadings: pack._meta?.includeSubheadings !== false,
        });
  return {
    ...pack,
    fullCopyText,
    _meta: {
      ...pack._meta,
      displayReady: pack._meta?.displayReady !== false,
      displayStampPath: true,
    },
  };
}

function ensureBlogDisplayPackLight(blog, input = {}) {
  if (shouldUseGpt55LightDelivery(blog, input)) {
    return ensureGpt55BlogDisplayPack(blog, input);
  }
  const forcedMission = blog?._meta?.forcedMissionProseRoute === true;
  let pack = forcedMission
    ? blog
    : applyHumanGradeFinishingPass(blog, input, { input });
  if (!blog?._meta?.humanVoiceDeliveryPass) {
    pack = forcedMission
      ? pack
      : applyHumanVoiceDeliveryPass(pack, input, { force: true });
  }
  pack = stripSearchSnippetLeakFromPack(pack, input);
  pack = sanitizeVerbatimTopicInPack(pack, input, "blog");
  if (!pack?.sections?.length) {
    pack = ensureMinBlogSections(pack, { input }, input);
  }
  pack = sanitizeBlogPackMetaLayer(pack);
  pack = scrubCustomerForbiddenSurfaceInPack(pack);
  pack = applyDisplayBodyGuardPack(pack, input);
  pack = collapseMechanicalHookFlood(pack, input);
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
  const metaClean = !hasMetaPhilosophyLeak(getBlogFullText(pack), input);
  const readiness = assessCompletionReadiness(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const editorPre = assertEditorPreOutput(pack, { input }, input);
  const placeholderGate = assertNoPlaceholderContamination(pack, input);
  const gateReasons = [
    ...(editorPre.ok ? [] : editorPre.reasons),
    ...(placeholderGate.ok ? [] : placeholderGate.reasons),
  ];
  const failReasons = pruneResolvedFailReasons(pack, input, gateReasons);
  const grade = assessDeliveryGrade(pack, input);
  const placeholderBlocked = !placeholderGate.ok;
  const deliveryReady = humanWriting.displayReady;
  const completeDraft =
    metaClean &&
    readiness.displayReady &&
    humanWriting.humanReady &&
    grade.grade !== "draft";
  const baseMeta = {
    ...pack._meta,
    forcedMissionProseRoute: forcedMission || pack._meta?.forcedMissionProseRoute || undefined,
    contentEvalPass: pack._meta?.contentEvalPass,
    failReasons,
    deliveryGrade: grade.grade,
    lengthTierMet: grade.tierMet,
    humanVoiceMet: grade.humanVoiceMet,
    humanTierMet: grade.tierMet && grade.humanVoiceMet,
    placeholderContamination: placeholderGate.counts,
    placeholderWithheld: placeholderBlocked || undefined,
    displayReady: placeholderBlocked ? false : deliveryReady,
    deliveryRescue: true,
    displayLightPath: true,
    completeDraft: placeholderBlocked ? false : completeDraft || undefined,
    publishReady: placeholderBlocked ? false : pack._meta?.publishReady === true,
    humanWritingDelivery: {
      humanReady: placeholderBlocked ? false : humanWriting.humanReady,
      displayReady: placeholderBlocked ? false : deliveryReady,
      reasons: (humanWriting.reasons || []).slice(0, 6),
    },
  };
  const { meta: displayMeta } = applyResetQualityDisplayBlock(pack, input, baseMeta);
  pack = finalizeContentQualityForDelivery(
    { ...pack, _meta: displayMeta },
    input,
    "blog"
  );
  if (isResearchHeavyTopicInput(input)) {
    pack = stampContentQualityValue(pack, input);
    pack = stampDeliveryGradeMeta(pack, input);
  }
  return {
    ...pack,
    fullCopyText: formatBlogFullCopy(pack, {
      includeSubheadings: pack._meta?.includeSubheadings !== false,
    }),
  };
}
import { assertNoIndustryContamination } from "@/lib/product/industryContaminationEngine";

function pruneResolvedFailReasons(pack, input = {}, reasons = []) {
  const ctx = { ...input, input };
  const full = getBlogFullText(pack);
  const title = pack?.representativeTitle || pack?.title || "";
  let next = [...reasons];
  if (
    title &&
    !isMechanicalListingTitle(title, ctx, input) &&
    !titleHasTemplateSpam(title) &&
    !titleEchoesTopicTwice(title, ctx, input) &&
    isNaturalDeliveryTitle(title, ctx, input)
  ) {
    next = next.filter(
      (r) =>
        r !== "mechanical_title" &&
        r !== "brand_mechanical_title" &&
        r !== "perspective_mechanical_title" &&
        r !== "editor_mechanical_title"
    );
  }
  const length = assertBlogLengthTier(input, pack);
  if (length.ok) {
    next = next.filter((r) => r !== "length_tier_under" && r !== "length_tier_over");
  }
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2, similarityPercent: 72 });
  if (dup.ok) {
    next = next.filter(
      (r) =>
        r !== "duplicate_killer_fail" &&
        r !== "duplicate_content" &&
        !String(r).startsWith("coverage_duplicate")
    );
  }
  const info = scoreInformationYield(full, ctx, "blog");
  if (info.ok) {
    next = next.filter(
      (r) =>
        r !== "information_yield_low" &&
        r !== "information_units_low" &&
        r !== "topic_dominance_low"
    );
  }
  const editor = assertEditorV95ForOutput(pack, ctx, input);
  if (editor.editorV95?.editorPass) {
    next = next.filter(
      (r) =>
        r !== "editor_editor_v95" &&
        r !== "editor_v95_fail" &&
        r !== "first_delivery_editor_v95"
    );
  }
  if (detectVerbatimTopicUsage(pack, input).ok) {
    next = next.filter((r) => r !== "editor_verbatim_topic_dump" && r !== "verbatim_topic_repeat");
  }
  const flow = scoreGiSeungJeonGyeol(pack);
  if (flow.ok) {
    next = next.filter(
      (r) =>
        !r.startsWith("structure_") &&
        r !== "editor_structure_flow"
    );
  }
  const editorPre = assertEditorPreOutput(pack, ctx, input);
  if (editorPre.ok) {
    next = next.filter(
      (r) =>
        !r.startsWith("editor_") &&
        !r.startsWith("structure_") &&
        r !== "duplicate_content" &&
        r !== "editor_tone_weak"
    );
  }
  const firstDelivery = assessFirstDeliveryQuality(pack, input);
  if (firstDelivery.displayReady) {
    next = next.filter((r) => !String(r).startsWith("first_delivery_"));
  }
  const factsGate = assessNoNewFactsForPublish(pack, input);
  if (factsGate.ok) {
    next = next.filter(
      (r) =>
        r !== "insufficient_verified_brand_facts" &&
        r !== "no_new_verified_facts"
    );
  }
  const industry = assertNoIndustryContamination(pack, input);
  if (industry.ok) {
    next = next.filter((r) => r !== "industry_contamination");
  }
  return [...new Set(next)];
}

/** 화면 표시용 — 메타 문장 제거 + fullCopyText 생성 */
export function ensureBlogDisplayPack(blog, input = {}) {
  if (!blog?.sections?.length) return blog;

  if (isQualityDeliveredDisplayPack(blog)) {
    const stamped = ensureBlogDisplayPackStampDelivered(blog, input);
    const placeholderGate = assertNoPlaceholderContamination(stamped, input);
    if (placeholderGate.ok) return stamped;
  }

  if (
    shouldUseGpt55LightDelivery(blog, input)
  ) {
    return ensureGpt55BlogDisplayPack(blog, input);
  }

  if (isCustomerDeliveryRescuePack(blog)) {
    return ensureBlogDisplayPackLight(blog, input);
  }
  if (isLlmOriginatedPack(blog) && hasSubstantiveLlmBody(blog, input)) {
    if (shouldUseGpt55LightDelivery(blog, input)) {
      return ensureGpt55BlogDisplayPack(blog, input);
    }
    const light = ensureBlogDisplayPackLight(blog, input);
    if (light?.sections?.length && hasSubstantiveLlmBody(light, input)) {
      return light;
    }
  }

  const salvageFinalized = Boolean(blog._meta?.salvageDeliveryFinalized);
  let pack = salvageFinalized ? blog : applyBrandContentEngine(blog, { input }, input);
  pack = applyBrandContentTitles(pack, { input }, input);
  pack = stripSearchSnippetLeakFromPack(pack, input);

  if (salvageFinalized) {
    pack = ensureVerbatimTopicCompliance(pack, input, "blog");
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = polishEditorV95Delivery(pack, { input }, input);
    pack = sanitizeEditorLeakPack(pack);
    pack = sanitizeBlogPackMetaLayer(pack);
  } else {
    pack = weaveTopicDominanceIntoPack(pack, { input });
    pack = applyDuplicateKiller(pack, { input }, "blog");
    pack = stripGlobalExactDuplicateSentences(pack);
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = ensureEditorDeliveryStructure(pack, input);
    pack = sanitizeEditorLeakPack(pack);
    pack = sanitizeVerbatimTopicInPack(pack, input, "blog");
    pack = applyEditorV95Pass(pack, { input }, input);
    pack = sanitizeBlogPackMetaLayer(pack);
  }

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
    const first = pack.sections?.[0];
    if (first) {
      let body = String(first.body || "").trim();
      if (body.startsWith(primaryTitle)) {
        body = body.slice(primaryTitle.length).replace(/^[\s,，—–-]+/, "").trim();
        pack = {
          ...pack,
          sections: [{ ...first, body }, ...pack.sections.slice(1)],
        };
      }
    }
  }

  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const salvageLengthOk =
    salvageFinalized && Boolean(blog._meta?.lengthTierMet);
  const llmPreserve =
    isLlmOriginatedPack(pack) &&
    (pack._meta?.llmDeliveryPolish || countBlogBodyCharsWithSpaces(pack) >= 450);
  if (!salvageLengthOk && !llmPreserve && countBlogBodyCharsWithSpaces(pack) < tier.min) {
    pack = deepenPackForSalvage(pack, tier.min, { input }, input);
    pack = applyDuplicateKiller(pack, { input }, "blog");
    pack = stripGlobalExactDuplicateSentences(pack);
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = sanitizeBlogPackMetaLayer(pack);
  }
  pack = applyDisplayBodyGuardPack(pack, input);
  pack = collapseMechanicalHookFlood(pack, input);
  pack = stripSearchSnippetLeakFromPack(pack, input);
  const outline = detectOutlineLeak(pack);
  if (outline.isOutline) {
    pack = sanitizeBlogPackMetaLayer(rewriteOutlinePackToProse(pack, input));
  }

  pack = finalizeContentQualityForDelivery(pack, input, "blog");

  const metaClean = !hasMetaPhilosophyLeak(getBlogFullText(pack), input);
  const readiness = assessCompletionReadiness(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const sqv = pack._meta?.sqv;
  const sqvReady =
    !isBriclogMissionEnforced() || sqv?.publishReady === true;
  const completeDraft =
    metaClean && readiness.displayReady && humanWriting.humanReady && sqvReady;
  const deliveryReady = humanWriting.displayReady;
  const editorPre = assertEditorPreOutput(pack, { input }, input);
  const placeholderGate = assertNoPlaceholderContamination(pack, input);
  const gateReasons = [
    ...(editorPre.ok ? [] : editorPre.reasons),
    ...(placeholderGate.ok ? [] : placeholderGate.reasons),
  ];
  const failReasons = pruneResolvedFailReasons(pack, input, gateReasons);
  const placeholderBlocked = !placeholderGate.ok;
  let meta = {
    ...pack._meta,
    failReasons,
    placeholderContamination: placeholderGate.counts,
    placeholderWithheld: placeholderBlocked || undefined,
    isBriefOnly: false,
    outlineDisplayRewritten: outline.isOutline || undefined,
    metaLayerScrubbed: metaClean || pack._meta?.metaLayerScrubbed,
    completeDraft: placeholderBlocked ? false : completeDraft || undefined,
    displayReady: placeholderBlocked ? false : deliveryReady,
    publishReady: placeholderBlocked ? false : completeDraft ? true : pack._meta?.publishReady === true,
    sqv: pack._meta?.sqv,
    publishReadiness: pack._meta?.publishReadiness,
    completionReadiness: {
      ...readiness,
      displayReady: deliveryReady,
    },
    humanWritingDelivery: {
      humanReady: placeholderBlocked ? false : humanWriting.humanReady,
      displayReady: placeholderBlocked ? false : deliveryReady,
      reasons: [
        ...(humanWriting.reasons || []).slice(0, 6),
        ...(placeholderBlocked ? ["placeholder_contamination"] : []),
      ],
    },
  };
  if (completeDraft && !placeholderBlocked) {
    meta.deliveryPreview = false;
    meta.deliveryPreviewMessage = undefined;
    meta.displayReady = true;
    meta.publishReady = true;
    meta.humanWritingDelivery.humanReady = true;
    meta.humanWritingDelivery.displayReady = true;
  }

  const resetBlocked = applyResetQualityDisplayBlock(pack, input, meta);
  pack = resetBlocked.pack;
  meta = resetBlocked.meta;

  const existing = String(pack.fullCopyText || "").trim();
  if (
    existing.length > 40 &&
    !detectOutlineLeak({ ...pack, fullCopyText: existing }).isOutline &&
    !hasMetaPhilosophyLeak(existing, input)
  ) {
    return { ...pack, _meta: meta };
  }
  return {
    ...pack,
    fullCopyText: formatBlogFullCopy(pack, {
      includeSubheadings: pack._meta?.includeSubheadings !== false,
    }),
    _meta: meta,
  };
}
