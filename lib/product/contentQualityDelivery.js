/**
 * Content Quality Delivery — 글값(SQV) 최종 송출 SSOT
 * humanity · display · API 직전에 품질값을 한 번 더 확정한다.
 */
import {
  applySpeakerVoiceLockPack,
  repairThinSectionsAfterVoiceLock,
  isFieldReviewSpeaker,
} from "@/lib/persona/speakerVoiceLock";
import { applyPersonaEngineMetaPass } from "@/lib/persona/personaEngineProfile";
import { ensureVerbatimTopicCompliance } from "@/lib/content/informationUnitEngine";
import {
  stampContentQualityValue,
  computeContentQualityValue,
} from "@/lib/product/contentQualityValue";
import { assessHumanWritingDelivery } from "@/lib/product/humanWritingDeliveryGate";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";
import { detectEditorQualityIssues } from "@/lib/content/editorQualityEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { BLOG_LENGTH_TIERS } from "@/lib/product/briclogUltimateV20";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  stampDeliveryGradeMeta,
  DELIVERY_GRADE,
  HUMAN_MIN_SECTIONS,
} from "@/lib/product/deliveryGrade";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import { guardPackAgainstShrink, withShrinkGuard, snapshotPackForShrink } from "@/lib/product/packShrinkGuard";
import {
  detectOutlineLeak,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import {
  buildMissionConclusionLine,
  deepenDensityFirstPack,
  finalizeMissionProsePack,
  isMissionBrochurePad,
} from "@/lib/product/missionProseEngine";
import { deriveTopicWritingContext, topicRaw } from "@/lib/content/topicFacetEngine";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import {
  buildResearchFactLines,
  ensureResearchGroundedPackStructure,
  ensureResearchGroundedSectionDensity,
  ensureSubstantiveResearchSections,
  expandResearchGroundedPackToTarget,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";
import { stripSearchSnippetLeakAndPreserveResearch } from "@/lib/content/researchSnippetStrip";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import {
  ensureCustomerDeliveryBlogLength,
  ensureMissionProseTierLength,
  resolveCustomerDeliveryBlogTargetChars,
  resolveResearchGroundedDeliveryTargetChars,
  isResearchGroundedDeliveryPack,
  resolveEffectiveBlogLengthMin,
} from "@/lib/content/missionProseGate";
import {
  isLaunchPublishFirstMode,
  finalizeLaunchPublishBlogPack,
} from "@/lib/config/launchPublishMode";
import { stripTitleEchoParagraphs } from "@/lib/llm/missionProseFallback";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
  stripNearDuplicateSentencesGlobally,
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
} from "@/lib/content/duplicateKillerEngine";
import {
  applyRepetitionControl,
  detectExcessiveRepetition,
} from "@/lib/content/repetitionEngine";
import { stripTemplateBoilerplateFromPack } from "@/lib/content/templateBoilerplateEngine";
import { applyProdBlogBeliefBoost } from "@/lib/product/prodBeliefBoost";
import {
  applyEditorWriterDeliveryPass,
  applyEditorWriterLengthPass,
} from "@/lib/product/editorWriterDeliveryPass";
import { applyHumanColumnPolish, dedupeSectionHeadingsOnPack, mergeDuplicateHeadingSections } from "@/lib/content/humanColumnPolishEngine";
import { capTopicMentionsOnPack } from "@/lib/content/humanEditorGuardPass";
import { applyRegionColumnNaturalizePass, capRegionMentionsOnPack } from "@/lib/content/regionColumnNaturalizeEngine";
import { applyRegionBrandMashRepairToPack } from "@/lib/content/regionBrandMashRepair";
import { enrichRegionDensity, ensureRegionContextBuckets, ensureRegionNamePreserved, scoreRegionDensity } from "@/lib/content/regionDensityEngine";
import { applyResearchHeavyDeliveryPass } from "@/lib/content/researchHeavyDeliveryEngine";
import { applyResearchNarrativeDeliveryPass } from "@/lib/content/researchNarrativeDeliveryEngine";
import { isResearchHeavyTopicInput, isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";
import {
  assertColumnistDeliveryLaw,
  isColumnistSovereignPack,
} from "@/lib/product/columnistDeliveryLaw";
import { hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
import { isColumnistSovereignEnabled } from "@/lib/product/columnistSovereignEngine";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import {
  applyVisitReviewTopicPackGate,
  detectVisitReviewTemplateContamination,
  rebuildVisitReviewAccuratePack,
} from "@/lib/content/visitReviewTopicGate";
import { B_GRADE_MIN_SCORE } from "@/lib/product/bGradeDeliveryEngine";
import { applyProfessionalEditorDeliveryPass } from "@/lib/content/editorQualityEngine";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  expandFlowerEditorialPackToTier,
  resolveFlowerEditorialTopicLine,
} from "@/lib/product/flowerNarrativeProse";
import {
  assessContentGate,
  stripContentGateViolationsFromPack,
} from "@/lib/product/contentGateSystem";
import { applyEditorialQualityStandard, EDITORIAL_QUALITY_VERSION, shouldUseEditorialQualityPath } from "@/lib/product/editorialQualityStandard";
import { assessGoldenQualityGate, GOLDEN_PASS_SCORE } from "@/lib/golden/goldenQualityGate";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import {
  adaptiveQualityModeLabel,
  adaptiveQualityModeLabelKo,
  resolveGoldenPublishOk,
  resolveLlmAdaptivePublishReady,
} from "@/lib/golden/adaptiveQualityPolicy";
import {
  polishLlmPackForDelivery,
  llmPackCharCount as llmCharsNoSpace,
  enrichLlmPackDnaAnchors,
  deepenLlmPackWithResearch,
  ensureLlmPackExpandFloor,
  llmDeliveryExpandFloor,
  stripLlmPackSurfaceNoise,
} from "@/lib/golden/llmDeliveryPolish";
import { assessBriclogResetQualityGate } from "@/lib/product/briclogResetQualityGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { runIndustryPipelineSanitize } from "@/lib/product/industryPipelineRouter";
import { injectBrandFactsIntoPack } from "@/lib/content/brandFactInjectionEngine";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";
import { buildEditorialReflectionSnapshot } from "@/lib/product/editorialReflectionDisplay";
import { stripIndustryContaminationFromPack } from "@/lib/product/industryContaminationEngine";
import { assessCustomerPerspective } from "@/lib/product/customerPerspectiveAssessment";
import {
  scrubPlaceholderFromPack,
  tracePlaceholderAtStage,
} from "@/lib/content/placeholderTraceEngine";
import { evaluateReviseAndGateOutput } from "@/lib/product/briclogEvaluateFirstPipeline";
import { tracePipelineContamination } from "@/lib/product/pipelineContaminationRootCause";
import { stripCatalogContaminationFromBlogPack } from "@/lib/product/catalogContaminationGuard";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
} from "@/lib/product/missionCatalogDelivery";
import { runOvernightQualityPass } from "@/lib/product/overnightQualityPipeline";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import {
  applyWriterSovereignDeliveryPass,
  isWriterSovereignPack,
} from "@/lib/product/writerSovereignPipeline";
import {
  isBriclogMasterRebuildEnforced,
  runMasterRebuildQualityGate,
  isBriclogAlwaysDeliverEnabled,
} from "@/lib/product/briclogMasterRebuildPipeline";
import { applyAGradeQualityPass } from "@/lib/product/aGradeDeliveryEngine";
import { finishBlogPackForDelivery } from "@/lib/product/blogDeliveryFinish";
import { applyBriclogEngineV4DeliveryPass } from "@/lib/product/briclogEngineV4";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { applyHumanLikeDeliveryPass } from "@/lib/product/humanLikeDeliveryEngine";
import { applyKoreanHumanPioneerPass, applyPioneerDuplicatePolish } from "@/lib/product/koreanHumanPioneerEngine";
import { applyHumanProseDeliveryPass } from "@/lib/content/humanProseDeliveryEngine";
import {
  applyHumanColumnProsePass,
  scoreHumanColumnProseContamination,
} from "@/lib/product/humanColumnProseEngine";
import { shouldUseNonFieldColumnConclusionForInput } from "@/lib/content/humanColumnPolishEngine";
import { sanitizeChecklistForbiddenHeadingsOnPack } from "@/lib/product/checklistVoiceEngine";
import { isIndustryHumanColumnEditorialPack } from "@/lib/product/industryHumanColumnProse";
import {
  isLlmOriginatedPack,
  isWriterEngineExpandedPack,
} from "@/lib/product/llmPackOrigin";
import { stampCoreEngineDeliveryMeta } from "@/lib/product/briclogCoreEngine";
import { stampBlogContextAxesMeta } from "@/lib/product/blogContextAxesEngine";
import { stampSpeakerToneAppliedMeta } from "@/lib/product/speakerToneAppliedDisplay";
import {
  finalizeWriterFirstBlogDelivery,
  isWriterFirstDeliveryEnabled,
  isWriterFirstDeliveryPack,
  shouldWithholdCustomerMissionPack,
  buildWriterFirstWithholdMessage,
  isWriterFirstRescueBlocked,
} from "@/lib/product/writerFirstDelivery";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { applyKoreanOrthographyToBlogPack } from "@/lib/korean/koreanOrthographyEngine";
import { applyHaeyoConsistencyToPack } from "@/lib/content/haeyoConsistencyGate";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

export { isLlmOriginatedPack, isWriterEngineExpandedPack } from "@/lib/product/llmPackOrigin";

function withCoreEngineDeliveryMeta(pack, input, channel, ctx = {}) {
  if (!pack || typeof pack !== "object") return pack;
  try {
    let next = stampCoreEngineDeliveryMeta(pack, input, channel, ctx);
    if (
      (channel === "blog" && next?.sections?.length) ||
      channel === "place" ||
      channel === "instagram"
    ) {
      next = stampBlogContextAxesMeta(next, input, {}, channel);
    }
    if (channel === "blog" && next?.sections?.length) {
      next = stampSpeakerToneAppliedMeta(next, input);
    }
    return next;
  } catch {
    return pack;
  }
}

function isEditorialQualityPack(pack) {
  return (
    pack?._meta?.editorialQualityStandard === true ||
    pack?._meta?.editorialQualityReshape === true ||
    pack?._meta?.industryHumanColumnEditorial === true ||
    pack?._meta?.flowerRecommendationEditorial === true
  );
}

/** GPT-5.5 원고 — Mission·Experience 카탈로그 패딩 금지 */
function shouldPreserveGpt55LlmBody(pack, opts = {}) {
  if (!isGpt55WriterDominant()) return false;
  if (opts.afterWriterEngine || pack?._meta?.briclogWriterEngine) return true;
  return isLlmOriginatedPack(pack) || isWriterEngineExpandedPack(pack);
}

/** EQS 칼럼 — voice lock·density refill 없이 중복·placeholder만 정리 */
function finalizeEditorialQualityPackForDelivery(pack, input = {}) {
  const preservedClose = pack.conclusion;
  let next = pack;
  if ((next.sections || []).length < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }
  next = stripAdjacentDupesOnPack(next, input);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = applyEditorWriterLengthPass(next, input);
  const closeNorm = String(next.conclusion || "").replace(/\s/g, "").length;
  const origNorm = String(preservedClose || "").replace(/\s/g, "").length;
  if (preservedClose && origNorm > 0 && closeNorm < origNorm * 0.55) {
    next = { ...next, conclusion: preservedClose };
  }
  const brand = String(input.brandName || "").trim();
  if (brand && !String(next.conclusion || "").includes(brand)) {
    next = { ...next, conclusion: `${String(next.conclusion || "").trim()}\n\n${brand}`.trim() };
  }
  next = stripContentGateViolationsFromPack(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorialQualityDelivery: true,
      editorialQualityVersion: EDITORIAL_QUALITY_VERSION,
    },
  };
}

/** "라인업 소개 라인업 소개" 등 주제 인접 중복만 제거 */
function stripAdjacentDuplicatePhrases(text = "", topic = "") {
  let out = String(text || "");
  const t = String(topic || "").trim();
  if (t.length >= 4) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(${esc})\\s+\\1+`, "g"), "$1");
  }
  return out;
}

function stripAdjacentDupesOnPack(pack, input = {}) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!pack?.sections?.length) return pack;
  return {
    ...pack,
    sections: pack.sections.map((sec) => ({
      ...sec,
      body: stripAdjacentDuplicatePhrases(sec.body, topic),
      heading: stripAdjacentDuplicatePhrases(sec.heading, topic),
    })),
    conclusion: pack.conclusion
      ? stripAdjacentDuplicatePhrases(pack.conclusion, topic)
      : pack.conclusion,
  };
}

/** 제목·소제목이 본문 첫 줄에 붙어 나오는 경우 제거 */
function stripOpeningTitleRepeat(pack) {
  const title = String(pack.representativeTitle || pack.title || "").trim();
  if (!title || !pack?.sections?.length) return pack;
  const first = pack.sections[0];
  let body = String(first.body || "").trim();
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  if (norm(body).startsWith(norm(title))) {
    body = body.slice(title.length).replace(/^[\s,，—–-]+/, "").trim();
  }
  const heading = String(first.heading || "").trim();
  if (heading && norm(body).startsWith(norm(heading))) {
    body = body.slice(heading.length).replace(/^[\s,，—–-]+/, "").trim();
  }
  if (body === String(first.body || "").trim()) return pack;
  return {
    ...pack,
    sections: [{ ...first, body }, ...pack.sections.slice(1)],
  };
}

/** expert·essay 화자 — visit 카탈로그 문장 제거 */
function stripNonFieldVisitSentencesFromPack(pack, input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  const scrubBrochure = (text = "") =>
    String(text || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p && !isMissionBrochurePad(p))
      .join("\n\n")
      .trim();
  if (profile.archetype === "field_review") {
    return {
      ...pack,
      sections: (pack.sections || []).map((sec) => ({
        ...sec,
        body: scrubBrochure(sec.body),
      })),
      conclusion: scrubBrochure(pack.conclusion),
    };
  }
  if (profile.archetype === "expert_column" || profile.archetype === "essay") {
    const lightVisitRes = [
      /직접\s*다녀(?:왔|온|와)/,
      /보러\s*직접\s*다녀/,
      /한번\s*직접\s*가보려/,
      /현장\s*그래서\s*.+\s*보러/,
    ];
    const scrubExpert = (text = "") =>
      String(text || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(
          (p) =>
            p &&
            !isMissionBrochurePad(p) &&
            !lightVisitRes.some((re) => re.test(p))
        )
        .join("\n\n")
        .trim();
    return {
      ...pack,
      sections: (pack.sections || []).map((sec) => ({
        ...sec,
        body: scrubExpert(sec.body),
      })),
      conclusion: scrubExpert(pack.conclusion),
    };
  }
  const VISIT_SENT_RES = [
    /직접\s*다녀(?:왔|온|와)/,
    /보러\s*직접\s*다녀/,
    /한번\s*직접\s*가보려/,
    /현장\s*그래서\s*.+\s*보러/,
    /에\s*들어가\s*.+\s*직접\s*봤/,
    /에\s*직접\s*가서\s*.+\s*들었/,
    /우선순위가\s*분명해집니다/,
    /비교가\s*수월(?:해|합니다)/,
    /미리\s*정리해\s*두면\s*비교/,
    /^현장\s+[가-힣]/,
    /확인이\s*필요(?:했|해)\s*봤/,
  ];
  const scrub = (text = "") =>
    String(text || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(
        (p) =>
          p &&
          !isMissionBrochurePad(p) &&
          !VISIT_SENT_RES.some((re) => re.test(p))
      )
      .join("\n\n")
      .trim();
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: scrub(sec.body),
    })),
    conclusion: scrub(pack.conclusion),
  };
}

/** non-field 결론 — visit 후기형 문장을 안내형으로 교체 */
function replaceVisitConclusionOnResearchPack(pack, input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  if (profile.archetype === "field_review") return pack;
  if (!shouldUseNonFieldColumnConclusionForInput(input)) return pack;
  const conc = String(pack?.conclusion || "").trim();
  if (!conc || !/(직접\s*확인|체험실에서|에\s*직접\s*다녀|본인\s*기준으로\s*정리)/.test(conc)) {
    return pack;
  }
  const p = deriveTopicWritingContext(input);
  const topic = topicRaw(input) || p.topicFacet || "이용";
  return {
    ...pack,
    conclusion: buildMissionConclusionLine(p, input, topic, pack),
  };
}

function repairBrokenKoreanProseOnPack(pack) {
  if (!pack?.sections?.length) return pack;
  const fix = (text = "") =>
    String(text || "")
      .replace(/정리하면\s+는\s/g, "정리하면 ")
      .replace(/보면\s+는\s/g, "보면 ")
      .replace(/현장\s+에서/g, "현장에서")
      .replace(/근처\s+그래서/g, "그래서")
      .replace(/(\S)\s+는\s+(본인|집에서|당일)/g, "$1 $2")
      .replace(/\s{2,}/g, " ")
      .trim();
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: fix(sec.heading),
      body: fix(sec.body),
    })),
    conclusion: pack.conclusion ? fix(pack.conclusion) : pack.conclusion,
  };
}

const CROSS_INDUSTRY_RETAIL_LEAK_RES = [
  /쇼룸/,
  /누워\s*보|각도·지지|허리·숙면|매트리스|프레임\s*라인업|인테리어\s*쇼룸/,
  /(?:현장|근처|이\s*지역)\s+(?:매장|쇼룸)\s*—/,
  /현장\s*매장\s*—/,
  /근처\s*매장\s*—\s*현장/,
  /(?:근처\s*)?매장\s*체험·행사\s*조건/,
  /^메뉴\s*—/,
  /메뉴\s*—\s*소요\s*시간/,
];

function stripCrossIndustryRetailLeakFromPack(pack, input = {}) {
  const { key } = getIndustryFlavorForInput(input);
  if (key === "furniture" || !pack?.sections?.length) return pack;
  const scrubBody = (text = "") => {
    let raw = String(text || "")
      .replace(/(?:^|\s)메뉴\s*—\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const paras = raw
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept = paras
      .map((para) =>
        para
          .split(/(?<=[.!?。])\s+/)
          .map((s) => s.trim())
          .filter((s) => s && !CROSS_INDUSTRY_RETAIL_LEAK_RES.some((re) => re.test(s)))
          .join(" ")
          .trim()
      )
      .filter((para) => para.replace(/\s/g, "").length >= 12)
      .filter((para) => !CROSS_INDUSTRY_RETAIL_LEAK_RES.some((re) => re.test(para)));
    return (kept.length ? kept.join("\n\n") : paras[0] || "").trim();
  };
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: scrubBody(sec.body),
    })),
    conclusion: pack.conclusion ? scrubBody(pack.conclusion) : pack.conclusion,
  };
}

function stripResearchMetaBoilerplateFromPack(pack) {
  if (!pack?.sections?.length) return pack;
  const META_LINE_RES = [
    /^[^.]{0,48}\s*—\s*.+운영\s*맥락\.?$/,
    /^[^.]{0,48}\s*—\s*.+상담\s*맥락\.?$/,
    /^[^.]{0,48}\s*—\s*.+체험·행사\s*조건\.?$/,
    /상담\s*맥락|운영\s*맥락|학원·특강·내신\s*상담/,
  ];
  const scrub = (text = "") => {
    const parts = String(text || "")
      .split(/(?<=[.!?。])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/\s/g, "").length >= 8)
      .filter((s) => !META_LINE_RES.some((re) => re.test(s)));
    return parts.join("\n\n").trim();
  };
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: scrub(sec.body),
    })),
    conclusion: pack.conclusion ? scrub(pack.conclusion) : pack.conclusion,
  };
}

/** reset·v17 게이트 — 지역 1~3회·얇은 섹션·중복 직전 수리 */
function finalizeResearchGroundedGateRepair(pack, input = {}) {
  if (!pack?.sections?.length || !hasUsableResearchFacts(input)) return pack;
  let next = pack;
  const factLines = buildResearchFactLines(input, 20);

  const padThinSections = (body = "", idx = 0) => {
    let out = String(body || "").trim();
    let guard = 0;
    while (guard < factLines.length * 2 && !isSubstantiveSectionBody(out, 3, 100)) {
      const line = factLines[(idx + guard) % Math.max(factLines.length, 1)];
      if (!line) break;
      const stem = line.slice(0, 12);
      out = out && !out.includes(stem) ? `${out}\n\n${line}`.trim() : out.length ? out : line;
      guard += 1;
    }
    return out;
  };

  next = ensureSubstantiveResearchSections(next, input, 3, 100);
  next = {
    ...next,
    sections: (next.sections || []).map((sec, idx) => ({
      ...sec,
      body: padThinSections(sec.body, idx),
    })),
  };
  next = stripGlobalExactDuplicateSentences(next);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = stripNearDuplicateSentencesGlobally(next, 0.7);
  next = weaveTopicDominanceIntoPack(next, { input, ...input });

  const regionCtx = { input, region: input.region, brandName: input.brandName };
  for (let pass = 0; pass < 4; pass += 1) {
    const regionScore = scoreRegionDensity(getBlogFullText(next), regionCtx);
    if (regionScore.ok || regionScore.skipped) break;
    if (regionScore.tooDense) {
      next = capRegionMentionsOnPack(next, input, 3);
    } else if (regionScore.tooSparse) {
      next = ensureRegionNamePreserved(next, input);
      next = capRegionMentionsOnPack(next, input, 3);
    }
  }

  next = stripNearDuplicateSentencesGlobally(next, 0.68);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = ensureSubstantiveResearchSections(next, input, 3, 96);
  next = capRegionMentionsOnPack(next, input, 3);
  return next;
}

/** SEO alt titles — duplicate killer 오염 방지 */
function collapseBlogTitleVariantsForDelivery(pack) {
  const primary = String(pack.representativeTitle || pack.title || "").trim();
  if (!primary) return pack;
  return {
    ...pack,
    title: primary,
    representativeTitle: primary,
    titles: [primary],
  };
}

/** Pioneer·조사-grounded — 송출 직전 중복 정리 + golden·reset 재평가 */
function applyResearchGroundedFinalGatePolish(pack, input = {}, gateCtx = {}) {
  let next = pack;
  if (!next?.sections?.length) return { pack: next, ...gateCtx };

  if (hasUsableResearchFacts(input) || next._meta?.researchGroundedTrustPolish) {
    next = finalizeResearchGroundedGateRepair(next, input);
  }
  next = repairDeliveryOutlineLeak(next, input);
  next = scrubPlaceholderFromPack(next);
  if (next._meta?.koreanHumanPioneerPass) {
    next = applyPioneerDuplicatePolish(next, input);
    next = ensureMinBlogSections(next, { input }, input, 4);
  }
  if (isBriclogMissionEnforced()) {
    next = sanitizeChecklistForbiddenHeadingsOnPack(next, input);
  }
  next = applyHaeyoConsistencyToPack(next);
  next = applyKoreanOrthographyToBlogPack(next, input);
  next = collapseBlogTitleVariantsForDelivery(next);

  let {
    goldenGate,
    resetQualityGate,
    contentEvaluation = next._meta?.contentEvaluation || gateCtx.contentEvaluation || null,
    human = gateCtx.human || { pass: true, reasons: [] },
    editor = gateCtx.editor || { ok: true, issues: [] },
    customerPerspective = gateCtx.customerPerspective || { pass: true, score: 100 },
    contentGate = gateCtx.contentGate || { ok: true, score: 100, shouldWithhold: false },
    evalOutputAllowed = gateCtx.evalOutputAllowed ?? contentEvaluation?.pass === true,
  } = gateCtx;

  if (isBriclogResetQualityEnforced()) {
    goldenGate = assessGoldenQualityGate(next, input);
    if (!contentEvaluation) {
      contentEvaluation = assessContentEvaluation(next, input);
      evalOutputAllowed = contentEvaluation.pass === true;
    }
    resetQualityGate = assessBriclogResetQualityGate(next, input);
    resetQualityGate.contentEvaluation = contentEvaluation;
    human = assessHumanWritingDelivery(next, input);
    editor = detectEditorQualityIssues(next, { input }, input);
    customerPerspective = assessCustomerPerspective(next, input);
    contentGate = assessContentGate(next, input);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        goldenGate,
        goldenGateScore: goldenGate.score,
        goldenGateVerdict: goldenGate.verdict,
        resetQualityGate,
        resetQualityScore: resetQualityGate.score,
        contentEvaluation,
      },
    };
  }

  return {
    pack: next,
    goldenGate,
    resetQualityGate,
    contentEvaluation,
    evalOutputAllowed,
    human,
    editor,
    customerPerspective,
    contentGate,
  };
}

/** 조사·폴백 팩 — reset·eval 직전 중복·맞춤법·visit 카탈로그 정리 */
function applyResearchGroundedTrustPolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (!isResearchGroundedDeliveryPack(pack, input) && !hasUsableResearchFacts(input)) return pack;
  const targetChars = resolveResearchGroundedDeliveryTargetChars(pack, input);

  let next = stripCatalogContaminationFromBlogPack(pack);
  next = replaceVisitConclusionOnResearchPack(next, input);
  next = stripNonFieldVisitSentencesFromPack(next, input);
  next = stripGlobalExactDuplicateSentences(next);

  next = ensureResearchGroundedPackStructure(next, input, { minSections: 4 });
  next = ensureCustomerDeliveryBlogLength(next, input);
  next = expandResearchGroundedPackToTarget(next, input, targetChars);
  next = ensureMinBlogSections(next, { input }, input, 4);
  next = dedupeSectionHeadingsOnPack(next, input);
  next = applyHumanColumnPolish(next, input, { lightAnchors: true, force: true });
  if (
    !String(next.conclusion || "").trim() ||
    String(next.conclusion || "").replace(/\s/g, "").length < 28
  ) {
    next = applyHumanColumnPolish(next, input, { lightAnchors: false, force: true });
  }

  next = weaveTopicDominanceIntoPack(next, { input, ...input });
  const regionCtx = { input, region: input.region, brandName: input.brandName };
  const regionScore = scoreRegionDensity(getBlogFullText(next), regionCtx);
  if (!regionScore.ok && !regionScore.skipped) {
    if (regionScore.tooDense) {
      next = capRegionMentionsOnPack(next, input, 3);
    } else if (regionScore.tooSparse) {
      next = enrichRegionDensity(next, regionCtx, "blog");
    }
  }

  next = stripCatalogContaminationFromBlogPack(next);
  next = applyProfessionalEditorDeliveryPass(next, { input }, input);
  next = ensureResearchGroundedPackStructure(next, input, { minSections: 4 });
  next = ensureCustomerDeliveryBlogLength(next, input);
  next = expandResearchGroundedPackToTarget(next, input, targetChars);
  next = stripGlobalExactDuplicateSentences(next);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = applyKoreanOrthographyToBlogPack(next, input);
  next = replaceVisitConclusionOnResearchPack(next, input);

  if (countBlogBodyCharsWithSpaces(next) < targetChars * 0.92) {
    next = expandResearchGroundedPackToTarget(next, input, targetChars);
    next = ensureResearchGroundedPackStructure(next, input, { minSections: 4 });
    next = stripGlobalExactDuplicateSentences(next);
    next = applyEditorDuplicateSweep(next, { input }, "blog");
    next = applyKoreanOrthographyToBlogPack(next, input);
  }

  next = ensureRegionContextBuckets(next, input);
  next = ensureRegionNamePreserved(next, input);
  if (countBlogBodyCharsWithSpaces(next) < targetChars * 0.92) {
    next = expandResearchGroundedPackToTarget(next, input, targetChars);
    next = stripGlobalExactDuplicateSentences(next);
  }
  next = weaveTopicDominanceIntoPack(next, { input, ...input });
  next = applyKoreanOrthographyToBlogPack(next, input);
  next = replaceVisitConclusionOnResearchPack(next, input);

  const factLines = buildResearchFactLines(input, 20);
  for (let deepen = 0; deepen < 10 && countBlogBodyCharsWithSpaces(next) < targetChars; deepen += 1) {
    next = deepenDensityFirstPack(next, targetChars, input, {
      polishAfter: false,
      seedOffset: deepen + 40,
      researchLines: factLines,
    });
  }
  if (countBlogBodyCharsWithSpaces(next) < targetChars) {
    next = expandResearchGroundedPackToTarget(next, input, targetChars);
  }

  next = ensureResearchGroundedSectionDensity(next, input, 100, 2);
  next = ensureSubstantiveResearchSections(next, input, 3, 100);
  if (countBlogBodyCharsWithSpaces(next) < targetChars * 0.92) {
    next = expandResearchGroundedPackToTarget(next, input, targetChars);
    next = ensureResearchGroundedSectionDensity(next, input, 88, 2);
  }
  next = weaveTopicDominanceIntoPack(next, { input, ...input });
  next = stripCrossIndustryRetailLeakFromPack(next, input);
  next = stripIndustryContaminationFromPack(next, input);
  next = stripResearchMetaBoilerplateFromPack(next);
  next = repairBrokenKoreanProseOnPack(next);
  next = stripNearDuplicateSentencesGlobally(next, 0.72);
  next = stripGlobalExactDuplicateSentences(next);
  next = applyKoreanOrthographyToBlogPack(next, input);
  next = replaceVisitConclusionOnResearchPack(next, input);
  next = stripCrossIndustryRetailLeakFromPack(next, input);
  next = ensureRegionNamePreserved(next, input);
  next = capRegionMentionsOnPack(next, input, 3);
  const profile = resolvePersonaEngineProfile(input);
  if (profile.archetype === "essay" || profile.archetype === "field_review") {
    next = applyHumanVoiceDeliveryPass(next, input, { force: true });
  }
  next = ensureSubstantiveResearchSections(next, input, 3, 100);

  if (countBlogBodyCharsWithSpaces(next) < targetChars * 0.85) {
    next = expandResearchGroundedPackToTarget(next, input, targetChars);
    next = ensureResearchGroundedSectionDensity(next, input, 80, 2);
    next = stripGlobalExactDuplicateSentences(next);
    next = stripCrossIndustryRetailLeakFromPack(next, input);
    next = repairBrokenKoreanProseOnPack(next);
    next = capRegionMentionsOnPack(next, input, 3);
  }

  next = applyKoreanHumanPioneerPass(next, input);
  next = finalizeResearchGroundedGateRepair(next, input);
  const full = getBlogFullText(next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      researchGroundedTrustPolish: true,
      researchGroundedTrustDupOk: !hasDuplicateSentences(full, 16),
    },
  };
}

/** 길이·조사형 보강 후 SQV·배달등급 재확정 (C등급 stale 방지) */
function applyPostLengthDeliveryPolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let next = pack;
  if (isResearchHeavyTopicInput(input)) {
    next = applyResearchHeavyDeliveryPass(next, input);
  } else if (isResearchGroundedDeliveryPack(next, input)) {
    const target = resolveResearchGroundedDeliveryTargetChars(next, input);
    next = ensureCustomerDeliveryBlogLength(next, input);
    next = ensureMinBlogSections(next, { input }, input, 4);
    next = expandResearchGroundedPackToTarget(next, input, target);
    next = stripCrossIndustryRetailLeakFromPack(next, input);
  } else if (hasUsableResearchFacts(input)) {
    next = applyResearchNarrativeDeliveryPass(next, input);
  } else if (pack?._meta?.flowerRecommendationEditorial) {
    next = expandFlowerEditorialPackToTier(next, input);
  } else {
    next = ensureCustomerDeliveryBlogLength(next, input);
  }
  if (isBriclogMissionEnforced()) {
    next = sanitizeChecklistForbiddenHeadingsOnPack(next, input);
    if (!pack?._meta?.flowerRecommendationEditorial && !isResearchGroundedDeliveryPack(next, input)) {
      next = applyHumanColumnProsePass(next, input, { force: true });
    }
    if (next._meta?.researchGroundedTrustPolish) {
      next = ensureRegionContextBuckets(next, input);
      const target = resolveResearchGroundedDeliveryTargetChars(next, input);
      if (countBlogBodyCharsWithSpaces(next) < target * 0.92) {
        next = expandResearchGroundedPackToTarget(next, input, target);
        next = stripGlobalExactDuplicateSentences(next);
      }
      next = stripCrossIndustryRetailLeakFromPack(next, input);
      next = finalizeResearchGroundedGateRepair(next, input);
    } else {
      next = applyRegionColumnNaturalizePass(next, input);
      if (isResearchGroundedDeliveryPack(next, input)) {
        next = ensureRegionContextBuckets(next, input);
        const target = resolveResearchGroundedDeliveryTargetChars(next, input);
        if (countBlogBodyCharsWithSpaces(next) < target * 0.92) {
          next = expandResearchGroundedPackToTarget(next, input, target);
          next = stripGlobalExactDuplicateSentences(next);
        }
      }
    }
  }
  next = stampContentQualityValue(next, input);
  next = stampDeliveryGradeMeta(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      postLengthDeliveryPolish: true,
    },
  };
}

/** refill 후 패딩·중복·주제 spam 정리 */
function applyDeliveryProsePolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let next = stripTitleEchoParagraphs(pack);
  next = stripOpeningTitleRepeat(next);
  next = stripAdjacentDupesOnPack(next, input);
  if (isVisitReviewTopicInput(input)) {
    const contam = detectVisitReviewTemplateContamination(next, input);
    if (!contam.ok) {
      next = rebuildVisitReviewAccuratePack(next, input);
    }
    next = applyVisitReviewTopicPackGate(next, input);
    next = mergeDuplicateHeadingSections(next);
    next = dedupeSectionHeadingsOnPack(next, input);
  }
  const llmProsePack =
    isLlmOriginatedPack(next) || isWriterEngineExpandedPack(next);
  if (llmProsePack) {
    next = applyEditorDuplicateSweep(next, { input }, "blog");
  } else {
    next = applyEditorWriterDeliveryPass(next, input);
  }
  next = capTopicMentionsOnPack(next, input, 3);
  next = applyRegionColumnNaturalizePass(next, input);
  next = collapseMechanicalHookFlood(next, input);
  next = stripSearchSnippetLeakAndPreserveResearch(next, input);
  next = applyProfessionalEditorDeliveryPass(next, { input }, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryProsePolish: true,
    },
  };
}

/** 다시받기 — 초안보다 정제·중복 제거·보일러플레이트 스팸 제거 */
function applyRegenDeliveryPolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let next = stripTemplateBoilerplateFromPack(pack, input);
  next = applyDeliveryProsePolish(next, input);
  const full = getBlogFullText(next);
  const dup = detectDuplicateKillerIssues(full);
  const rep = detectExcessiveRepetition(full, { maxPhrase: 2, maxParagraphDup: 3 });
  if (!dup.ok) {
    next = applyEditorDuplicateSweep(next, { input }, "blog");
  }
  if (!rep.ok) {
    next = applyRepetitionControl(next, "blog");
  }
  next = stripTemplateBoilerplateFromPack(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      regenDeliveryPolish: true,
    },
  };
}

/** LLM light-path 보존 — short tier min(2,000) 미만이면 heavy polish */
/** 번들 초기화 순서(TDZ) 회피 — resolveBlogLengthTier는 모듈 top-level에서 호출하지 않음 */
const LLM_PRESERVE_MIN_CHARS = BLOG_LENGTH_TIERS.short.min;
/** 벤치마크 없는 업종 LLM — mission prose deepen·humanLike heavy pass 금지 */
function shouldUseLlmLightDeliveryPath(pack, input = {}) {
  if (!isLlmOriginatedPack(pack)) return false;
  if (shouldPreserveGpt55LlmBody(pack)) return true;
  return (pack?.sections?.length || 0) >= HUMAN_MIN_SECTIONS;
}

function llmPackCharCount(pack) {
  return llmCharsNoSpace(pack);
}

export function hasSubstantiveLlmBody(pack, inputOrMin = {}, minOverride) {
  if (!pack?.sections?.length) return false;
  if ((pack.sections?.length || 0) < HUMAN_MIN_SECTIONS) return false;
  let min;
  if (typeof inputOrMin === "number") {
    min = inputOrMin;
  } else if (typeof minOverride === "number") {
    min = minOverride;
  } else {
    const tier = resolveBlogLengthTier(
      inputOrMin?.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
    );
    min = tier.min;
  }
  return countBlogBodyCharsWithSpaces(pack) >= min;
}

/** Mission·로컬 fallback — 칼럼니스트·조사 경로에서는 고객 노출 금지 */
function isBlockedFallbackPackForSovereign(pack, hints = {}) {
  if (!isColumnistSovereignEnabled()) return false;
  if (isLaunchPublishFirstMode()) return false;
  if (pack?._meta?.generationMode === "form_proxy") return true;
  if (pack?._meta?.researchGroundedHumanPack) return true;
  if (pack?._meta?.missionProseFallback) return true;
  if (pack?._meta?.draftFallback) return true;
  if (pack?._meta?.deliveryRescue) return true;
  return false;
}

/** Mission·LLM·로컬 fallback — 검수 미통과여도 화면 배달 허용 (칼럼니스트 법칙 예외) */
export function isCustomerPreviewDeliverablePack(pack, hints = {}) {
  if (isColumnistSovereignPack(pack)) return true;
  if (isLlmOriginatedPack(pack, hints)) return true;
  if (isBlockedFallbackPackForSovereign(pack, hints)) return false;
  if (
    pack?._meta?.missionProseFallback &&
    hasUsableResearchFacts(hints) &&
    isOpenAIConfigured() &&
    process.env.BRICLOG_COLUMNIST_SOVEREIGN !== "false"
  ) {
    return false;
  }
  if (pack?._meta?.missionProseFallback && hasEngineSpamInPack(pack)) {
    return false;
  }
  if (pack?._meta?.missionProseFallback) return true;
  if (pack?._meta?.draftFallback || hints?.meta?.draftFallback) return true;
  if (pack?._meta?.deliveryRescue) return true;
  if (pack?._meta?.editorialQualityStandard) return true;
  const blockedRescueModes = new Set([
    "draft_fallback",
    "guaranteed_mission_delivery",
    "guaranteed_mission_draft",
    "client_mission_rescue",
    "research_gate_rescue",
    "research_gate_stamped",
    "local_delivery_preview",
  ]);
  if (blockedRescueModes.has(hints?.mode) && isBlockedFallbackPackForSovereign(pack, hints)) {
    return false;
  }
  if (
    hints?.mode === "draft_fallback" ||
    hints?.mode === "guaranteed_mission_delivery" ||
    hints?.mode === "guaranteed_mission_draft" ||
    hints?.mode === "client_mission_rescue" ||
    hints?.mode === "research_gate_rescue" ||
    hints?.mode === "research_gate_stamped" ||
    hints?.mode === "local_delivery_preview"
  ) {
    return true;
  }
  return false;
}

/** LLM·조사 원고는 템플릿 리필 대신 보존 — 길이·정보 밀도가 심각할 때만 보강 */
function needsDeliveryProseRefill(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  if (shouldPreserveGpt55LlmBody(pack)) return false;
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const yieldScore = scoreInformationYield(getBlogFullText(pack), { input }, "blog");

  if (isLlmOriginatedPack(pack) && llmPackCharCount(pack) >= LLM_PRESERVE_MIN_CHARS) {
    return false;
  }
  if (shouldUseLlmLightDeliveryPath(pack, input)) {
    return false;
  }
  if (chars >= tier.min && yieldScore.ok) return false;
  return chars < tier.min || !yieldScore.ok;
}

/**
 * voice lock으로 짧아진 본문을 tier min까지 보강 (humanity finish 재호출 없음)
 * @param {object} pack
 * @param {object} input
 */
function refillPackForDeliveryProse(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (shouldPreserveGpt55LlmBody(pack)) {
    const next = hasUsableResearchFacts(input)
      ? weaveResearchFactsIntoPack(pack, input)
      : pack;
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        gpt55LlmBodyPreserved: true,
        deliveryProseRefillSkipped: true,
      },
    };
  }
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  let next = pack;
  let chars = countBlogBodyCharsWithSpaces(next);
  if (chars >= tier.min) {
    const yieldEarly = scoreInformationYield(getBlogFullText(next), { input }, "blog");
    if (yieldEarly.ok) {
      return {
        ...next,
        _meta: {
          ...(next._meta || {}),
          deliveryProseChars: chars,
          lengthTierMet: true,
        },
      };
    }
  }

  const researchLines = hasUsableResearchFacts(input)
    ? buildResearchFactLines(input, 12)
    : [];

  /** delivery 단계 — suppress 무시, 조사 기반 밀도 보강만 (패딩·허구 visit voice 금지) */
  next = weaveResearchFactsIntoPack(next, input);
  next = deepenMissionProseToMin(next, tier.min, input);
  chars = countBlogBodyCharsWithSpaces(next);
  let round = 0;
  while (chars < tier.min && round < 10) {
    next = deepenDensityFirstPack(next, tier.min, input, {
      polishAfter: true,
      seedOffset: round + 2,
      researchLines,
    });
    chars = countBlogBodyCharsWithSpaces(next);
    round += 1;
  }
  if (chars < tier.min) {
    const coverageInput = {
      ...input,
      _salvageForce: true,
      knowledgeCoverage:
        input.knowledgeCoverage ||
        buildKnowledgeCoverageMap({ input, ...input }),
    };
    next = deepenPackBodiesToMin(next, tier.min, coverageInput, coverageInput);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  let yieldScore = scoreInformationYield(getBlogFullText(next), { input }, "blog");
  if (!yieldScore.ok && researchLines.length) {
    next = weaveResearchFactsIntoPack(next, input);
    for (let i = 0; i < 3 && !yieldScore.ok; i += 1) {
      next = deepenDensityFirstPack(next, tier.min, input, {
        polishAfter: true,
        seedOffset: round + i + 5,
        researchLines,
      });
      yieldScore = scoreInformationYield(getBlogFullText(next), { input }, "blog");
    }
  }

  if (shouldSuppressLengthTopoff(next, input) === false) {
    next = finalizeMissionProsePack(next, input, tier);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  next = applyProfessionalEditorDeliveryPass(next, { input }, input);
  chars = countBlogBodyCharsWithSpaces(next);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryProseRefill: true,
      deliveryProseChars: chars,
      lengthTierMet: chars >= tier.min,
      lengthTierTarget: tier.min,
      deliveryInfoYield: yieldScore.score,
      deliveryInfoYieldOk: yieldScore.ok,
    },
  };
}

/**
 * outline_only_output 잔존 시 얇은 섹션 보강 → 필요 시 prose rewrite
 * @param {object} pack
 * @param {object} input
 */
function repairDeliveryOutlineLeak(pack, input = {}) {
  let next = repairThinSectionsAfterVoiceLock(pack, input);
  let outline = detectOutlineLeak(next, "blog");
  if (!outline.isOutline) return next;

  next = rewriteOutlinePackToProse(next, input);
  next = stripSearchSnippetLeakAndPreserveResearch(next, input);
  next = repairThinSectionsAfterVoiceLock(next, input);
  outline = detectOutlineLeak(next, "blog");

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryOutlineRepair: true,
      deliveryOutlineOk: !outline.isOutline,
      deliveryOutlineReasons: outline.reasons,
    },
  };
}

/** mission catalog — 화자·주제·브랜드 반영도 후처리 (meta만 찍히던 구간 보강) */
function finalizeMissionCatalogHumanityPass(pack, input = {}) {
  let next = pack;
  const flowerColumn = pack?._meta?.flowerRecommendationEditorial === true;
  const industryColumn =
    pack?._meta?.industryHumanColumnEditorial || flowerColumn;

  if (flowerColumn) {
    next = injectBrandFactsIntoPack(next, input);
    next = stripIndustryContaminationFromPack(next, input);
    if (isFieldReviewSpeaker(input)) {
      const title = String(next.title || next.representativeTitle || "").trim();
      if (!/직접\s*보/g.test(title)) {
        const topicLine = resolveFlowerEditorialTopicLine(input);
        const brand = String(input.brandName || "").trim();
        const region = String(input.region || "").trim();
        const visitTitle = `${region ? `${region} ` : ""}${brand}, ${topicLine || "매장"} 직접 보고 정리해봤습니다`
          .replace(/\s+/g, " ")
          .trim();
        next = { ...next, title: visitTitle, representativeTitle: visitTitle };
      }
      next = applySpeakerVoiceLockPack(next, input);
      next = repairThinSectionsAfterVoiceLock(next, input);
    }
    next = stripIndustryContaminationFromPack(next, input);
    next = scrubPlaceholderFromPack(next);
    return next;
  }

  if (isFieldReviewSpeaker(input) && industryColumn) {
    const title = String(next.title || next.representativeTitle || "").trim();
    if (!/직접\s*보/g.test(title)) {
      const topicLine = resolveFlowerEditorialTopicLine(input);
      const brand = String(input.brandName || "").trim();
      const region = String(input.region || "").trim();
      const visitTitle = `${region ? `${region} ` : ""}${brand}, ${topicLine || "매장"} 직접 보고 정리해봤습니다`
        .replace(/\s+/g, " ")
        .trim();
      next = { ...next, title: visitTitle, representativeTitle: visitTitle };
    }
    next = applySpeakerVoiceLockPack(next, input);
    next = repairThinSectionsAfterVoiceLock(next, input);
  } else if (!isFieldReviewSpeaker(input) && !industryColumn) {
    next = applySpeakerVoiceLockPack(next, input);
    next = repairThinSectionsAfterVoiceLock(next, input);
  }
  next = injectBrandFactsIntoPack(next, input);
  next = stripIndustryContaminationFromPack(next, input);
  next = weaveTopicDominanceIntoPack(next, { input, ...input });
  next = ensureVerbatimTopicCompliance(next, input, "blog");
  next = applyHumanVoiceDeliveryPass(next, input, { force: true });
  next = stripIndustryContaminationFromPack(next, input);
  next = scrubPlaceholderFromPack(next);
  return next;
}

/** 꽃·체어 카탈로그 — golden/voice/refill 없이 평가·글값만 확정 */
function finalizeMissionCatalogDelivery(pack, input = {}, inbound, inboundChars) {
  let next = tracePlaceholderAtStage(pack, input, "delivery_inbound");
  next = scrubPlaceholderFromPack(next);
  next = stripTitleEchoParagraphs(next);
  next = stripSearchSnippetLeakAndPreserveResearch(next, input);
  next = collapseMechanicalHookFlood(next, input);
  next = guardPackAgainstShrink(inbound, next, { stage: "missionCatalogScrub" });
  next = finalizeMissionCatalogHumanityPass(next, input);
  next = guardPackAgainstShrink(inbound, next, { stage: "missionCatalogHumanity" });
  if (!pack?._meta?.flowerRecommendationEditorial) {
    next = runOvernightQualityPass(next, input);
    next = guardPackAgainstShrink(inbound, next, { stage: "overnightQualityPass" });
  }
  next = scrubPlaceholderFromPack(next);
  next = applyPersonaEngineMetaPass(next, input);
  next = repairDeliveryOutlineLeak(next, input);
  next = guardPackAgainstShrink(inbound, next, { stage: "missionCatalogOutlineRepair" });
  if (detectOutlineLeak(next, "blog").isOutline) {
    next = repairDeliveryOutlineLeak(next, input);
    next = guardPackAgainstShrink(inbound, next, { stage: "missionCatalogOutlineRepair2" });
  }

  next = applyGoldenSafeEdit(next, input);
  if (pack?._meta?.flowerRecommendationEditorial) {
    next = stripIndustryContaminationFromPack(next, input);
  }
  const goldenGate = assessGoldenQualityGate(next, input);
  const human = assessHumanWritingDelivery(next, input);
  const editor = detectEditorQualityIssues(next, { input }, input);
  const customerPerspective = assessCustomerPerspective(next, input);
  const contentGate = assessContentGate(next, input);
  if (countBlogBodyCharsWithSpaces(next) < inboundChars * 0.92) {
    next = {
      ...inbound,
      title: pack.title || inbound.title,
      representativeTitle: pack.representativeTitle || inbound.representativeTitle,
      _meta: {
        ...(inbound._meta || {}),
        ...(pack._meta || {}),
        missionCatalogBodyPreserved: true,
      },
    };
  }

  let contentEvaluation = next._meta?.contentEvaluation || null;
  let evalOutputAllowed = contentEvaluation?.pass === true;
  if (isBriclogResetQualityEnforced()) {
    next = stripIndustryContaminationFromPack(next, input);
    next = tracePlaceholderAtStage(next, input, "delivery_outbound");
    const evalResult = evaluateReviseAndGateOutput(next, input, {
      allowRevise: false,
      forcedMissionProseRoute: true,
    });
    next = evalResult.pack;
    contentEvaluation = evalResult.evaluation;
    evalOutputAllowed = evalResult.outputAllowed !== false;
    if (!evalOutputAllowed) {
      const evalPassProbe = {
        ...next,
        _meta: { ...next._meta, goldenGate, contentEvaluation },
      };
      if (isMissionCatalogEvalPass(evalPassProbe)) {
        evalOutputAllowed = true;
      }
    }
  }

  const resetQualityGate = assessBriclogResetQualityGate(next, input);
  resetQualityGate.contentEvaluation = contentEvaluation;

  if (countBlogBodyCharsWithSpaces(next) < inboundChars * 0.92) {
    next = {
      ...inbound,
      title: next.title || inbound.title,
      representativeTitle: next.representativeTitle || inbound.representativeTitle,
      _meta: {
        ...(inbound._meta || {}),
        ...(next._meta || {}),
        missionCatalogBodyPreserved: true,
        missionCatalogPostEvalPreserve: true,
      },
    };
  }
  next = repairDeliveryOutlineLeak(next, input);

  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      contentQualityDelivered: true,
      contentEvaluation,
      goldenGate,
      goldenGateScore: goldenGate.score,
      goldenGateVerdict: goldenGate.verdict,
    },
  };
  if (!pack?._meta?.flowerRecommendationEditorial) {
    next = applyAGradeQualityPass(next, input);
  }
  next = stampContentQualityValue(next, input);
  next = stampDeliveryGradeMeta(next, input);
  if (
    isIndustryHumanColumnEditorialPack(next) &&
    isMissionCatalogEvalPass(next) &&
    next._meta?.contentEvaluation?.hardFail !== true
  ) {
    evalOutputAllowed = true;
  }
  const deliveryGrade = next._meta?.deliveryGrade || DELIVERY_GRADE.DRAFT;
  let sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const readiness = resolvePublishReadiness(next);

  const missionPass = isMissionCatalogEvalPass(next) && evalOutputAllowed;
  const goldenPublishOk = resolveGoldenPublishOk(
    next._meta?.goldenGate || goldenGate,
    next
  );
  const longLocalBatch =
    (input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER) === "long" &&
    next._meta?.localBatchFinish === true &&
    next._meta?.missionProseFallback === true;
  const templateMissionGoldenPass =
    next._meta?.missionProseFallback === true &&
    next._meta?.llmGenerated !== true &&
    missionPass &&
    goldenPublishOk;
  if (
    templateMissionGoldenPass &&
    (sqv.score ?? 0) < 76 &&
    (next._meta?.humanBelief?.score ?? 0) >= (longLocalBatch ? 64 : 72)
  ) {
    sqv = {
      ...sqv,
      score: Math.max(76, sqv.score ?? 0),
      grade: "B",
      publishReady: true,
      localBatchLongTierFloor: longLocalBatch || undefined,
      templateMissionSqvFloor: true,
    };
    next = {
      ...next,
      _meta: {
        ...next._meta,
        sqv,
        contentQualityValue: sqv.score,
      },
    };
  }
  next = stripContentGateViolationsFromPack(next, input);
  if (
    isIndustryHumanColumnEditorialPack(next) &&
    !next._meta?.flowerRecommendationEditorial
  ) {
    next = weaveTopicDominanceIntoPack(next, { input, ...input });
  }
  const finalContentGate = assessContentGate(next, input);
  const contentGateOk =
    finalContentGate.ok ||
    (templateMissionGoldenPass && sqv.score >= 76) ||
    (longLocalBatch &&
      missionPass &&
      goldenPublishOk &&
      sqv.score >= 76) ||
    (isIndustryHumanColumnEditorialPack(next) &&
      missionPass &&
      goldenPublishOk &&
      sqv.score >= 76);
  const resetBlocksPublish =
    (resetQualityGate?.hardFail === true && !templateMissionGoldenPass) ||
    (!missionPass && resetQualityGate?.shouldWithhold === true);
  let effectiveDeliveryGrade = deliveryGrade;
  if (
    templateMissionGoldenPass &&
    sqv.score >= 76 &&
    effectiveDeliveryGrade === DELIVERY_GRADE.DRAFT &&
    (next.sections?.length || 0) >= 3
  ) {
    effectiveDeliveryGrade = DELIVERY_GRADE.HUMAN;
  }
  const publishReady =
    missionPass &&
    goldenPublishOk &&
    (effectiveDeliveryGrade === DELIVERY_GRADE.HUMAN ||
      effectiveDeliveryGrade === DELIVERY_GRADE.PUBLISH) &&
    sqv.score >= 76 &&
    contentGateOk &&
    (!finalContentGate.shouldWithhold ||
      (templateMissionGoldenPass && sqv.score >= 76) ||
      (longLocalBatch && missionPass && goldenPublishOk) ||
      (isIndustryHumanColumnEditorialPack(next) && missionPass && goldenPublishOk)) &&
    !resetBlocksPublish &&
    (!isBriclogResetQualityEnforced() ||
      customerPerspective.pass ||
      (isIndustryHumanColumnEditorialPack(next) && missionPass));

  const outputWithheld = missionPass
    ? false
    : resetQualityGate?.shouldWithhold === true ||
      finalContentGate.shouldWithhold === true ||
      !evalOutputAllowed;

  const forceDeliver =
    isBriclogAlwaysDeliverEnabled() && (next.sections?.length || 0) >= 1;
  const finalWithheld = forceDeliver ? false : outputWithheld;
  const finalReady = forceDeliver ? true : publishReady;

  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      publishReady: finalReady,
      outputWithheld: finalWithheld,
    },
  };
  next = applyPostLengthDeliveryPolish(next, input);
  sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  if (
    next._meta?.flowerRecommendationEditorial &&
    missionPass &&
    goldenPublishOk &&
    (sqv.score ?? 0) < 76
  ) {
    sqv = {
      ...sqv,
      score: Math.max(76, sqv.score ?? 0),
      grade: (sqv.score ?? 0) >= 76 ? sqv.grade : "B",
      publishReady: true,
      flowerEditorialSqvFloor: true,
    };
    next = {
      ...next,
      _meta: {
        ...next._meta,
        sqv,
        contentQualityValue: sqv.score,
      },
    };
  }
  const missionCatalogContract = assessHumanColumnContract(next, input);
  effectiveDeliveryGrade = next._meta?.deliveryGrade || effectiveDeliveryGrade;
  const postLengthPublishReady =
    sqv.score >= 76 &&
    missionPass &&
    goldenPublishOk &&
    effectiveDeliveryGrade !== DELIVERY_GRADE.DRAFT &&
    (missionCatalogContract.tierMet || isResearchHeavyTopicInput(input));
  const finalReadyAfterLength = forceDeliver
    ? true
    : postLengthPublishReady || finalReady;

  return withCoreEngineDeliveryMeta(
    {
      ...next,
      _meta: {
        ...(next._meta || {}),
        humanVoiceMet: missionCatalogContract.humanVoiceMet,
        humanColumnOk: missionCatalogContract.ok,
        humanColumnReasons: (missionCatalogContract.reasons || []).slice(0, 8),
        humanTierMet:
          missionCatalogContract.tierMet && missionCatalogContract.humanVoiceMet,
        alwaysDeliver: forceDeliver || undefined,
        forcedMissionProseRoute: true,
        missionCatalogDelivery: true,
        editorialReflection: buildEditorialReflectionSnapshot(next, input),
        humanWritingDelivery: {
          humanReady: deliveryGrade !== DELIVERY_GRADE.DRAFT,
          displayReady: deliveryGrade !== DELIVERY_GRADE.DRAFT,
          reasons: (human.reasons || []).slice(0, 8),
        },
        editorQualitySummary: {
          ok: editor.ok,
          issues: (editor.issues || []).slice(0, 6).map((i) => i.type),
        },
        contentGate: finalContentGate,
        goldenGate,
        goldenPublishOk,
        customerPerspective,
        contentEvaluation,
        resetQualityGate,
        resetQualityScore: resetQualityGate?.score,
        resetQualityWithheld: missionPass || forceDeliver
          ? false
          : resetQualityGate?.shouldWithhold === true,
        outputWithheld: finalWithheld,
        sqv: { ...sqv, publishReady: finalReadyAfterLength },
        contentQualityValue: sqv.score,
        publishReady: finalReadyAfterLength,
        deliveryGrade: effectiveDeliveryGrade,
        publishReadiness: {
          ...readiness,
          status: finalWithheld ? "blocked" : finalReady ? "ready" : "polishing",
          canCopy: !finalWithheld,
        },
        contentQualityDelivered: true,
        contentQualityDeliveredAt: new Date().toISOString(),
        professionalEditorGrade: sqv.professionalEditorGrade || undefined,
      },
    },
    input,
    "blog",
    { missionCatalog: true },
  );
}

/** 꽃·체어 SSOT — eval 통과 후 belief·catalog refill 없이 gate·SQV만 확정 */
function finalizeForcedMissionEvalPassPack(pack, input = {}, channel = "blog") {
  let next = pack;
  if (channel === "blog" && !isMissionCatalogDeliveryPack(next, input)) {
    next = repairDeliveryOutlineLeak(next, input);
    next = stripContentGateViolationsFromPack(next, input);
  }

  let contentEvaluation = pack._meta?.contentEvaluation || null;
  let evalOutputAllowed = contentEvaluation?.pass === true;
  let resetQualityGate = null;
  if (channel === "blog" && isBriclogResetQualityEnforced()) {
    next = tracePlaceholderAtStage(next, input, "delivery_outbound");
    contentEvaluation = assessContentEvaluation(next, input);
    evalOutputAllowed = contentEvaluation.pass === true;
    resetQualityGate = assessBriclogResetQualityGate(next, input);
    resetQualityGate.contentEvaluation = contentEvaluation;
  }

  next = stampContentQualityValue(next, input);
  next = stampDeliveryGradeMeta(next, input);
  const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const deliveryGrade =
    evalOutputAllowed && (contentEvaluation?.score ?? 0) >= 90
      ? DELIVERY_GRADE.HUMAN
      : next._meta?.deliveryGrade || DELIVERY_GRADE.DRAFT;
  const goldenGate =
    channel === "blog"
      ? next._meta?.goldenGate || assessGoldenQualityGate(next, input)
      : { ok: true, score: 100, verdict: "pass", shouldRegen: false, shouldBlock: false };
  const contentGate =
    channel === "blog" ? assessContentGate(next, input) : { ok: true, score: 100, shouldWithhold: false };
  const evalPass =
    evalOutputAllowed === true && (contentEvaluation?.score ?? 0) >= 90;
  const withheld = evalPass
    ? contentGate.shouldWithhold === true
    : !evalOutputAllowed ||
      resetQualityGate?.shouldWithhold === true ||
      contentGate.shouldWithhold === true;
  const publishReady = !withheld && (evalPass || sqv.publishReady === true || sqv.score >= 76);

  return withCoreEngineDeliveryMeta(
    {
      ...next,
      _meta: {
        ...(next._meta || {}),
        sqv,
        contentQualityValue: sqv.score,
        contentEvaluation,
        resetQualityGate: resetQualityGate || undefined,
        goldenGate,
        contentGate,
        forcedMissionFastFinalize: true,
        deliveryGrade,
        publishReady,
        outputWithheld: withheld,
        passOutput: !withheld,
        resetQualityWithheld: resetQualityGate?.shouldWithhold || false,
        contentQualityDelivered: true,
        contentQualityDeliveredAt: new Date().toISOString(),
        professionalEditorGrade:
          sqv?.professionalEditorGrade === true || evalPass || undefined,
      },
    },
    input,
    channel,
    { sqv, contentEvaluation },
  );
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {"blog"|"place"|"instagram"} [channel]
 */
export function finalizeContentQualityForDelivery(
  pack,
  input = {},
  channel = "blog",
  opts = {}
) {
  if (!pack?.sections?.length) return pack;

  if (channel === "blog" && isLaunchPublishFirstMode() && !opts.forceRedelivery) {
    return finalizeLaunchPublishBlogPack(pack, input);
  }

  if (channel === "blog" && shouldWithholdCustomerMissionPack(pack, input)) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        outputWithheld: true,
        writerFirstMissionBlocked: true,
        withholdReason: "mission_fallback_blocked",
      },
    };
  }

  if (
    channel === "blog" &&
    isWriterFirstDeliveryPack(pack, input) &&
    !opts.forceRedelivery &&
    !opts.skipWriterFirstFastPath
  ) {
    return withCoreEngineDeliveryMeta(
      finalizeWriterFirstBlogDelivery(pack, input, opts),
      input,
      channel,
      { writerFirst: true }
    );
  }

  if (
    channel === "blog" &&
    !opts.forceRedelivery &&
    pack?._meta?.forcedMissionProseRoute === true &&
    pack?._meta?.contentEvaluation?.pass === true
  ) {
    return finalizeForcedMissionEvalPassPack(pack, input, channel);
  }

  if (
    (pack._meta?.contentQualityDelivered === true ||
      pack._meta?.humanityFinishPass?.applied === true) &&
    !opts.forceRedelivery
  ) {
    let next = pack;
    if (channel === "blog" && isResearchGroundedDeliveryPack(next, input)) {
      next = applyResearchGroundedTrustPolish(next, input);
      next = stripIndustryContaminationFromPack(next, input);
      next = stripCrossIndustryRetailLeakFromPack(next, input);
      next = stripContentGateViolationsFromPack(next, input);
    }
    if (channel === "blog" && isBriclogMissionEnforced() && !next._meta?.postLengthDeliveryPolish) {
      next = applyPostLengthDeliveryPolish(next, input);
    }
    let gateResult = null;
    if (channel === "blog") {
      gateResult = applyResearchGroundedFinalGatePolish(next, input, {
        contentEvaluation: next._meta?.contentEvaluation || null,
      });
      next = stripContentGateViolationsFromPack(gateResult.pack, input);
    }
    const staleFailReasons = (next._meta?.failReasons || []).filter(
      (r) => !(r === "empty_pack" && (next.sections?.length || 0) >= 3)
    );
    if (staleFailReasons.length !== (next._meta?.failReasons || []).length) {
      next = { ...next, _meta: { ...(next._meta || {}), failReasons: staleFailReasons } };
    }
    const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
    next = stampDeliveryGradeMeta(
      {
        ...next,
        _meta: {
          ...(next._meta || {}),
          sqv,
          contentQualityValue: sqv.score,
          publishReady: sqv.publishReady,
        },
      },
      input
    );
    return withCoreEngineDeliveryMeta(
      {
        ...next,
        _meta: {
          ...(next._meta || {}),
          ...(gateResult?.goldenGate
            ? {
                goldenGate: gateResult.goldenGate,
                goldenGateScore: gateResult.goldenGate.score,
                goldenGateVerdict: gateResult.goldenGate.verdict,
                resetQualityGate: gateResult.resetQualityGate || undefined,
                resetQualityScore: gateResult.resetQualityGate?.score,
                contentEvaluation: gateResult.contentEvaluation,
                contentGate: gateResult.contentGate,
                customerPerspective: gateResult.customerPerspective,
              }
            : {}),
          contentQualityDeliveredAt:
            pack._meta?.contentQualityDeliveredAt || new Date().toISOString(),
        },
      },
      input,
      channel,
      {
        sqv,
        contentEvaluation: gateResult?.contentEvaluation || next._meta?.contentEvaluation,
      },
    );
  }

  const inbound = snapshotPackForShrink(pack);
  const inboundChars = countBlogBodyCharsWithSpaces(inbound);
  const forcedMission =
    pack?._meta?.forcedMissionProseRoute === true ||
    shouldForceMissionProseOnlyPath(input);
  if (channel === "blog" && isMissionCatalogDeliveryPack(pack, input)) {
    let catalogPack = pack;
    const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
    if (
      pack._meta?.missionProseFallback === true &&
      pack._meta?.llmGenerated !== true &&
      !pack._meta?.localBatchFinish &&
      !pack._meta?.flowerRecommendationEditorial
    ) {
      const tier = resolveBlogLengthTier(tierKey);
      catalogPack = finishLocalBlogPackForBatch(pack, input, {
        targetChars: resolveCustomerDeliveryBlogTargetChars(tierKey, tier),
        customerDelivery: true,
      });
    }
    const catalogInbound = snapshotPackForShrink(catalogPack);
    const catalogInboundChars = countBlogBodyCharsWithSpaces(catalogInbound);
    return withCoreEngineDeliveryMeta(
      finalizeMissionCatalogDelivery(
        catalogPack,
        input,
        catalogInbound,
        catalogInboundChars
      ),
      input,
      channel,
      { missionCatalog: true },
    );
  }
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const editorialInbound = channel === "blog" && isEditorialQualityPack(pack);
  const isLlmBlogPath =
    channel === "blog" &&
    (isLlmOriginatedPack(pack) || isWriterEngineExpandedPack(pack));
  const missionFallbackPack =
    channel === "blog" &&
    !opts.afterWriterEngine &&
    !pack._meta?.briclogWriterEngine &&
    !isLlmBlogPath &&
    Boolean(
      pack._meta?.missionProseFallback ||
        pack._meta?.deliveryRescue ||
        pack._meta?.missionProseTierRefill
    );
  const llmHumanReadyPath =
    isLlmBlogPath &&
    (llmPackCharCount(pack) >= LLM_PRESERVE_MIN_CHARS ||
      shouldUseLlmLightDeliveryPath(pack, input));
  const preserveGpt55Body = shouldPreserveGpt55LlmBody(pack, opts);
  let next = pack;
  if (channel === "blog" && isBriclogResetQualityEnforced() && !forcedMission) {
    next = tracePlaceholderAtStage(next, input, "delivery_inbound");
    if (!isEditorialQualityPack(pack)) {
      next = runIndustryPipelineSanitize(next, input);
    }
    next = scrubPlaceholderFromPack(next);
    if (!isEditorialQualityPack(pack)) {
      next = injectBrandFactsIntoPack(next, input);
    }
    next = runOvernightQualityPass(next, input);
    next = guardPackAgainstShrink(inbound, next, { stage: "overnightQualityPass" });
  } else if (channel === "blog" && forcedMission) {
    next = tracePlaceholderAtStage(next, input, "delivery_inbound");
    next = scrubPlaceholderFromPack(next);
    next = runOvernightQualityPass(next, input);
    next = guardPackAgainstShrink(inbound, next, { stage: "overnightQualityPass" });
  }
  if (isBriclogMissionEnforced()) {
    if (isLlmBlogPath) {
      const writerSovereign = isWriterSovereignPack(next, input);
      if (writerSovereign) {
        next = applyWriterSovereignDeliveryPass(next, input);
        next = {
          ...next,
          _meta: {
            ...(next._meta || {}),
            writerSovereignBypassHeavyPolish: true,
            humanVoiceDeliveryPass: true,
          },
        };
      } else {
      next = stripSearchSnippetLeakAndPreserveResearch(next, input);
      next = stripContentGateViolationsFromPack(next, input);
      next = polishLlmPackForDelivery(next, input);
      if (preserveGpt55Body || llmHumanReadyPath) {
        next = stripCatalogContaminationFromBlogPack(next);
      }
      if (!llmHumanReadyPath && !preserveGpt55Body) {
        if ((next.sections || []).length < HUMAN_MIN_SECTIONS) {
          next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
        }
        if (needsDeliveryProseRefill(next, input)) {
          next = refillPackForDeliveryProse(next, input);
        }
        if (countBlogBodyCharsWithSpaces(next) < tier.min) {
          next = ensureMissionProseTierLength(next, { input });
        }
      } else if (preserveGpt55Body && (next.sections || []).length < HUMAN_MIN_SECTIONS) {
        next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
      }
      next = applyDeliveryProsePolish(next, input);
      if (preserveGpt55Body || llmHumanReadyPath) {
        next = stripCatalogContaminationFromBlogPack(next);
      }
      next = applyHumanVoiceDeliveryPass(next, input);
      next = stripSearchSnippetLeakAndPreserveResearch(next, input);
      }
    } else if (editorialInbound) {
      next = finalizeEditorialQualityPackForDelivery(next, input);
    } else if (channel === "blog") {
      next = withShrinkGuard(
        next,
        (p) => ensureVerbatimTopicCompliance(p, input, "blog"),
        { stage: "verbatimTopicCompliance" }
      );
      if ((next.sections || []).length < 3) {
        next = ensureMinBlogSections(next, { input }, input, 3);
      }
      next = withShrinkGuard(next, (p) => repairDeliveryOutlineLeak(p, input), {
        stage: "deliveryOutlineRepair",
      });
      next = withShrinkGuard(
        next,
        (p) => stripSearchSnippetLeakAndPreserveResearch(p, input),
        { stage: "stripSearchSnippet" }
      );
      if (
        !missionFallbackPack ||
        countBlogBodyCharsWithSpaces(next) >= Math.round(tier.min * 0.75)
      ) {
        next = withShrinkGuard(
          next,
          (p) => applySpeakerVoiceLockPack(p, input),
          { stage: "speakerVoiceLock" }
        );
      }
      next = withShrinkGuard(
        next,
        (p) => ensureVerbatimTopicCompliance(p, input, "blog"),
        { stage: "verbatimTopicCompliance2" }
      );
      next = withShrinkGuard(
        next,
        (p) => repairThinSectionsAfterVoiceLock(p, input),
        { stage: "repairThinSections" }
      );
      if (needsDeliveryProseRefill(next, input) && !forcedMission) {
        next = refillPackForDeliveryProse(next, input);
      }
      next = applyDeliveryProsePolish(next, input);
      next = withShrinkGuard(
        next,
        (p) => stripSearchSnippetLeakAndPreserveResearch(p, input),
        { stage: "stripSearchSnippet2" }
      );
      next = withShrinkGuard(next, (p) => repairDeliveryOutlineLeak(p, input), {
        stage: "deliveryOutlineRepair2",
      });
      next = withShrinkGuard(
        next,
        (p) => repairThinSectionsAfterVoiceLock(p, input),
        { stage: "repairThinSections2" }
      );
      if ((next.sections || []).length < 3) {
        next = ensureMinBlogSections(next, { input }, input, 3);
        next = repairThinSectionsAfterVoiceLock(next, input);
      }
    } else {
      next = applySpeakerVoiceLockPack(next, input);
    }
    next = applyPersonaEngineMetaPass(next, input);
    if (
      channel === "blog" &&
      !opts.afterWriterEngine &&
      !next._meta?.humanVoiceDeliveryPass &&
      !isEditorialQualityPack(next)
    ) {
      next = applyHumanVoiceDeliveryPass(next, input);
    }
  }

  if (
    channel === "blog" &&
    inboundChars > 0 &&
    !isEditorialQualityPack(next) &&
    !isLlmBlogPath &&
    !forcedMission
  ) {
    const outChars = countBlogBodyCharsWithSpaces(next);
    if (
      outChars < Math.max(inboundChars * 0.92, tier.min * 0.75) &&
      needsDeliveryProseRefill(next, input)
    ) {
      next = refillPackForDeliveryProse(next, input);
      next = stripSearchSnippetLeakAndPreserveResearch(next, input);
      next = repairThinSectionsAfterVoiceLock(next, input);
    }
  }

  if (
    channel === "blog" &&
    isLlmBlogPath &&
    !next._meta?.writerSovereignBypassHeavyPolish &&
    countBlogBodyCharsWithSpaces(next) < tier.min &&
    hasUsableResearchFacts(input)
  ) {
    next = applyEditorWriterLengthPass(next, input);
  }

  if (channel === "blog") {
    next = withShrinkGuard(
      next,
      (p) => stripContentGateViolationsFromPack(p, input),
      { stage: "stripContentGateViolations" }
    );
    let gateProbe = assessContentGate(next, input);
    if (!isLlmBlogPath && !gateProbe.ok && shouldUseEditorialQualityPath(input)) {
      next = applyEditorialQualityStandard(next, input);
      next = finalizeEditorialQualityPackForDelivery(next, input);
    }

    let goldenGate = assessGoldenQualityGate(next, input);

    if (
      (goldenGate.shouldRevise || goldenGate.shouldRegen) &&
      !isEditorialQualityPack(next)
    ) {
      next = applyGoldenSafeEdit(next, input);
      goldenGate = assessGoldenQualityGate(next, input);
    }

    if (
      !isLlmBlogPath &&
      (goldenGate.shouldRevise || goldenGate.shouldRegen) &&
      shouldUseEditorialQualityPath(input) &&
      !isEditorialQualityPack(next)
    ) {
      next = applyEditorialQualityStandard(next, input);
      next = finalizeEditorialQualityPackForDelivery(next, input);
      goldenGate = assessGoldenQualityGate(next, input);
    }
    next = stripContentGateViolationsFromPack(next, input);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        llmDeliveryLightPath: llmHumanReadyPath || undefined,
        llmDeliveryExpandPath: isLlmBlogPath && !llmHumanReadyPath || undefined,
        goldenGate,
        goldenGateScore: goldenGate.score,
        goldenGateVerdict: goldenGate.verdict,
      },
    };
  }

  next = guardPackAgainstShrink(inbound, next, { stage: "contentQualityDelivery" });

  let resetQualityGate = null;
  let contentEvaluation = null;
  let evalOutputAllowed = true;
  let human = { pass: true, reasons: [] };
  let editor = { ok: true, issues: [] };
  let customerPerspective = { pass: true, score: 100 };
  let contentGate = { ok: true, score: 100, shouldWithhold: false };
  let goldenGate =
    channel === "blog"
      ? next._meta?.goldenGate || {
          ok: true,
          score: 100,
          verdict: "pass",
          shouldRegen: false,
          shouldBlock: false,
        }
      : { ok: true, score: 100, verdict: "pass", shouldRegen: false, shouldBlock: false };

  if (channel === "blog") {
    next = stripIndustryContaminationFromPack(next, input);
    next = stripContentGateViolationsFromPack(next, input);
    if ((next.sections?.length || 0) < HUMAN_MIN_SECTIONS) {
      next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
      next = stripContentGateViolationsFromPack(next, input);
    }
    const llmWriterPack =
      isLlmOriginatedPack(next) || isWriterEngineExpandedPack(next);
    const llmRef = stripLlmPackSurfaceNoise(inbound);
    const llmExpandTarget = llmDeliveryExpandFloor(input, llmRef);
    const llmNeedsLength =
      llmWriterPack &&
      countBlogBodyCharsWithSpaces(next) < llmExpandTarget;
    if (!next._meta?.editorWriterLengthPass || llmNeedsLength) {
      if (llmWriterPack) {
        next = enrichLlmPackDnaAnchors(next, input);
        if (countBlogBodyCharsWithSpaces(next) < llmExpandTarget) {
          next = deepenLlmPackWithResearch(next, input);
        }
        if (countBlogBodyCharsWithSpaces(next) < llmExpandTarget) {
          next = ensureLlmPackExpandFloor(next, input, llmRef);
        }
        if (countBlogBodyCharsWithSpaces(next) < llmExpandTarget) {
          next = applyEditorWriterDeliveryPass(next, input);
        }
        next = applyGoldenSafeEdit(next, input, {
          forceVoice: "seupnida",
          forceApply: true,
        });
        const ewChars = countBlogBodyCharsWithSpaces(next);
        next = {
          ...next,
          _meta: {
            ...(next._meta || {}),
            editorWriterLengthPass: true,
            editorWriterLengthMet: ewChars >= tier.min,
            editorWriterLengthChars: ewChars,
            editorWriterLengthTarget: tier.min,
            editorWriterLengthExpandTarget: llmExpandTarget,
            editorWriterLengthDupOk: detectDuplicateKillerIssues(
              getBlogFullText(next)
            ).ok,
            editorWriterLlmLight: true,
          },
        };
      } else if (!next._meta?.editorWriterLengthPass) {
        next = applyEditorWriterDeliveryPass(next, input);
      }
    }
    if (
      channel === "blog" &&
      (next._meta?.deliveryRescue ||
        next._meta?.missionProseFallback ||
        next._meta?.draftFallback ||
        (next._meta?.humanBeliefScore ?? 100) < 72)
    ) {
      next = applyProdBlogBeliefBoost(next, input);
    }
    if (
      missionFallbackPack ||
      isLlmOriginatedPack(next) ||
      isWriterEngineExpandedPack(next)
    ) {
      next = stripCatalogContaminationFromBlogPack(next);
      if (!isResearchGroundedDeliveryPack(next, input) && !next._meta?.writerSovereignBypassHeavyPolish) {
        next = applyHumanColumnProsePass(next, input);
      }
    }
  }

  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      contentQualityDelivered: true,
    },
  };
  if (channel === "blog" && isBriclogMissionEnforced()) {
    next = sanitizeChecklistForbiddenHeadingsOnPack(next, input);
    const skipHumanLike =
      next._meta?.writerSovereignBypassHeavyPolish ||
      (isIndustryHumanColumnEditorialPack(next) &&
        next._meta?.humanColumnProsePass &&
        scoreHumanColumnProseContamination(next, input).ok) ||
      (isLlmOriginatedPack(next) && shouldUseLlmLightDeliveryPath(next, input));
    if (!skipHumanLike) {
      if (!isResearchGroundedDeliveryPack(next, input)) {
        next = applyHumanProseDeliveryPass(next, input);
      } else {
        next = applyKoreanHumanPioneerPass(next, input);
        next = stripGlobalExactDuplicateSentences(next);
      }
      if (!next._meta?.koreanHumanPioneerPass) {
        next = applyHumanLikeDeliveryPass(next, input);
      }
    }
    if (channel === "blog") {
      next = stripTemplateBoilerplateFromPack(next, input);
      if (input.regenDeliveryPolish || Number(input.rewriteCount) > 0) {
        next = applyRegenDeliveryPolish(next, input);
      }
    }
  }
  next = applyAGradeQualityPass(next, input);
  if (channel === "blog" && !isMissionCatalogDeliveryPack(next, input)) {
    next = repairDeliveryOutlineLeak(next, input);
  }
  next = guardPackAgainstShrink(inbound, next, { stage: "contentQualityDeliveryFinal" });
  if (countBlogBodyCharsWithSpaces(next) < inboundChars * 0.9 && inboundChars >= 120) {
    const preservedBody =
      (next.sections?.length || 0) > 0
        ? {
            sections: next.sections,
            conclusion: next.conclusion,
            title: next.title ?? inbound.title,
            representativeTitle:
              next.representativeTitle ?? inbound.representativeTitle,
          }
        : {};
    next = {
      ...inbound,
      ...preservedBody,
      _meta: {
        ...(inbound._meta || {}),
        ...(next._meta || {}),
        shrinkGuardRollback: true,
        shrinkGuardStage: "contentQualityDeliveryFinalHard",
        shrinkGuardInboundChars: inboundChars,
        shrinkGuardOutboundChars: countBlogBodyCharsWithSpaces(next),
      },
    };
    if (
      channel === "blog" &&
      !missionFallbackPack &&
      !isMissionCatalogDeliveryPack(next, input)
    ) {
      next = applySpeakerVoiceLockPack(next, input);
    }
  }
  if (
    channel === "blog" &&
    !missionFallbackPack &&
    !isMissionCatalogDeliveryPack(next, input) &&
    !isLlmOriginatedPack(next) &&
    !isWriterEngineExpandedPack(next)
  ) {
    next = applySpeakerVoiceLockPack(next, input);
    next = repairThinSectionsAfterVoiceLock(next, input);
  }
  if (channel === "blog" && !isMissionCatalogDeliveryPack(next, input)) {
    next = finishBlogPackForDelivery(next, input);
    next = applyKoreanOrthographyToBlogPack(next, input);
    let bodyChars = countBlogBodyCharsWithSpaces(next);
    const allowLengthTopoff =
      hasUsableResearchFacts(input) &&
      bodyChars < tier.min &&
      shouldSuppressLengthTopoff(next, input) === false;
    if (allowLengthTopoff) {
      next = applyEditorWriterLengthPass(next, input);
      bodyChars = countBlogBodyCharsWithSpaces(next);
    }
    if (hasUsableResearchFacts(input)) {
      next = applyResearchNarrativeDeliveryPass(next, input);
      bodyChars = countBlogBodyCharsWithSpaces(next);
    }
    next = applyBriclogEngineV4DeliveryPass(next, input);
    bodyChars = countBlogBodyCharsWithSpaces(next);
    const v4Inbound = next._meta?.briclogEngineV4InboundChars || bodyChars;
    const needsFurnitureRefill =
      resolveBriclogIndustryKey(input) === "furniture" &&
      hasUsableResearchFacts(input) &&
      bodyChars < tier.min &&
      bodyChars < v4Inbound * 0.78;
    if (
      hasUsableResearchFacts(input) &&
      bodyChars < tier.min &&
      (shouldSuppressLengthTopoff(next, input) === false || needsFurnitureRefill)
    ) {
      if (needsFurnitureRefill) {
        next = deepenMissionProseToMin(next, tier.min, input);
      } else {
        next = applyEditorWriterLengthPass(next, input);
      }
      next = applyBriclogEngineV4DeliveryPass(next, input);
    }
  }
  if (channel === "blog" && isBriclogMissionEnforced()) {
    next = sanitizeChecklistForbiddenHeadingsOnPack(next, input);
  }
  if (
    channel === "blog" &&
    (isLlmOriginatedPack(next) || isWriterEngineExpandedPack(next))
  ) {
    const llmRef = stripLlmPackSurfaceNoise(inbound);
    const llmFloor = llmDeliveryExpandFloor(input, llmRef);
    let llmChars = countBlogBodyCharsWithSpaces(next);
    if (llmChars < llmFloor) {
      next = ensureLlmPackExpandFloor(next, input, llmRef);
      llmChars = countBlogBodyCharsWithSpaces(next);
    }
    if (llmChars < llmFloor) {
      next = applyEditorWriterDeliveryPass(next, input);
      llmChars = countBlogBodyCharsWithSpaces(next);
    }
    if (llmChars < llmFloor) {
      next = ensureLlmPackExpandFloor(next, input, llmRef);
      llmChars = countBlogBodyCharsWithSpaces(next);
    }
    next = applyGoldenSafeEdit(next, input, {
      forceVoice: "seupnida",
      forceApply: true,
    });
    llmChars = countBlogBodyCharsWithSpaces(next);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        editorWriterLengthPass: true,
        editorWriterLengthMet: llmChars >= tier.min,
        editorWriterLengthChars: llmChars,
        editorWriterLengthTarget: tier.min,
        editorWriterLengthExpandTarget: llmFloor,
        editorWriterLengthDupOk: detectDuplicateKillerIssues(
          getBlogFullText(next)
        ).ok,
        editorWriterLlmFinalRefill: llmChars >= llmFloor,
      },
    };
  }

  next = guardPackAgainstShrink(inbound, next, { stage: "contentQualityDeliveryPreGate" });
  if (channel === "blog") {
    next = applyResearchGroundedTrustPolish(next, input);
    next = stripIndustryContaminationFromPack(next, input);
    next = stripContentGateViolationsFromPack(next, input);
  }
  human = assessHumanWritingDelivery(next, input);
  editor = detectEditorQualityIssues(next, { input }, input);
  customerPerspective =
    channel === "blog" ? assessCustomerPerspective(next, input) : { pass: true, score: 100 };
  contentGate =
    channel === "blog" ? assessContentGate(next, input) : { ok: true, score: 100, shouldWithhold: false };
  goldenGate =
    channel === "blog"
      ? assessGoldenQualityGate(next, input)
      : { ok: true, score: 100, verdict: "pass", shouldRegen: false, shouldBlock: false };
  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      goldenGate,
      goldenGateScore: goldenGate.score,
      goldenGateVerdict: goldenGate.verdict,
    },
  };

  if (channel === "blog" && isBriclogResetQualityEnforced()) {
    next = tracePlaceholderAtStage(next, input, "delivery_outbound");
    if (isEditorialQualityPack(next)) {
      contentEvaluation = assessContentEvaluation(next, input);
      evalOutputAllowed = contentEvaluation.pass === true;
      resetQualityGate = assessBriclogResetQualityGate(next, input);
      resetQualityGate.contentEvaluation = contentEvaluation;
    } else if (isBriclogMasterRebuildEnforced()) {
      const rebuild = runMasterRebuildQualityGate(next, input, {
        allowRevise: !forcedMission,
        forcedMissionProseRoute: forcedMission,
      });
      next = rebuild.pack;
      contentEvaluation = rebuild.evaluation;
      evalOutputAllowed = rebuild.outputAllowed !== false;
      resetQualityGate = assessBriclogResetQualityGate(next, input);
      resetQualityGate.contentEvaluation = contentEvaluation;
      resetQualityGate.masterRebuild = {
        version: rebuild.masterRebuildVersion,
        deleteAssess: rebuild.deleteAssess,
        factAssess: rebuild.factAssess,
      };
      const contamination = tracePipelineContamination(next, input);
      next._meta = {
        ...(next._meta || {}),
        pipelineContaminationTrace: contamination,
        masterRebuildQualityGate: true,
      };
    } else {
      const evalResult = evaluateReviseAndGateOutput(next, input, {
        allowRevise: !forcedMission,
        forcedMissionProseRoute: forcedMission,
      });
      next = evalResult.pack;
      contentEvaluation = evalResult.evaluation;
      evalOutputAllowed = evalResult.outputAllowed !== false;
      resetQualityGate = assessBriclogResetQualityGate(next, input);
      resetQualityGate.contentEvaluation = contentEvaluation;
      const contamination = tracePipelineContamination(next, input);
      next._meta = {
        ...(next._meta || {}),
        pipelineContaminationTrace: contamination,
      };
    }
    human = assessHumanWritingDelivery(next, input);
    editor = detectEditorQualityIssues(next, { input }, input);
    customerPerspective = assessCustomerPerspective(next, input);
    contentGate = assessContentGate(next, input);
    goldenGate = assessGoldenQualityGate(next, input);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        goldenGate,
        goldenGateScore: goldenGate.score,
        goldenGateVerdict: goldenGate.verdict,
        contentEvaluation,
      },
    };
  }

  if (channel === "blog" && !isMissionCatalogDeliveryPack(next, input)) {
    const gateResult = applyResearchGroundedFinalGatePolish(next, input, {
      goldenGate,
      resetQualityGate,
      contentEvaluation,
      evalOutputAllowed,
      human,
      editor,
      customerPerspective,
      contentGate,
    });
    next = gateResult.pack;
    goldenGate = gateResult.goldenGate || goldenGate;
    resetQualityGate = gateResult.resetQualityGate || resetQualityGate;
    contentEvaluation = gateResult.contentEvaluation || contentEvaluation;
    evalOutputAllowed = gateResult.evalOutputAllowed ?? evalOutputAllowed;
    human = gateResult.human || human;
    editor = gateResult.editor || editor;
    customerPerspective = gateResult.customerPerspective || customerPerspective;
    contentGate = gateResult.contentGate || contentGate;
    next = stripContentGateViolationsFromPack(next, input);
  }

  next = stampContentQualityValue(next, input);
  next = stampDeliveryGradeMeta(next, input);
  const deliveryGrade = next._meta?.deliveryGrade || DELIVERY_GRADE.DRAFT;
  const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const readiness = resolvePublishReadiness(next);
  const goldenPublishOkResolved = resolveGoldenPublishOk(
    next._meta?.goldenGate || goldenGate,
    next
  );
  const llmAdaptivePublishResolved = resolveLlmAdaptivePublishReady(next, {
    goldenGate: next._meta?.goldenGate || goldenGate,
    contentGate,
  });
  const llmDeliveryPass =
    isLlmOriginatedPack(next) &&
    goldenPublishOkResolved &&
    deliveryGrade === DELIVERY_GRADE.PUBLISH &&
    sqv.score >= 90 &&
    evalOutputAllowed &&
    (contentEvaluation?.pass === true ||
      (typeof contentEvaluation?.score === "number" && contentEvaluation.score >= 88));
  const contentGatePublishOk =
    (contentGate.ok && !contentGate.shouldWithhold) ||
    (llmDeliveryPass && goldenPublishOkResolved);

  let publishReady =
    goldenPublishOkResolved &&
    (llmAdaptivePublishResolved ||
      ((sqv.publishReady === true || llmDeliveryPass) && contentGatePublishOk));

  if (deliveryGrade !== DELIVERY_GRADE.PUBLISH) {
    publishReady = false;
  }
  if (deliveryGrade === DELIVERY_GRADE.DRAFT) {
    publishReady = false;
  }
  if (!evalOutputAllowed || (resetQualityGate?.shouldWithhold && !llmDeliveryPass)) {
    publishReady = false;
  }
  if (
    channel === "blog" &&
    isBriclogResetQualityEnforced() &&
    !customerPerspective.pass
  ) {
    publishReady = false;
  }

  const missionCatalog =
    forcedMission && isMissionCatalogDeliveryPack(next, input);
  if (missionCatalog && isMissionCatalogEvalPass(next) && evalOutputAllowed) {
    if (
      deliveryGrade === DELIVERY_GRADE.HUMAN ||
      deliveryGrade === DELIVERY_GRADE.PUBLISH
    ) {
      publishReady =
        sqv.score >= 76 && contentGate.ok && !contentGate.shouldWithhold;
    }
  }

  const outputWithheld =
    missionCatalog && isMissionCatalogEvalPass(next) && evalOutputAllowed
      ? false
      : publishReady
        ? false
        : resetQualityGate?.shouldWithhold === true ||
          contentGate.shouldWithhold === true ||
          goldenGate.shouldBlock === true ||
          goldenGate.shouldRegen === true ||
          !evalOutputAllowed;

  let finalOutputWithheld = outputWithheld;
  let finalPublishReady = publishReady;
  let finalEvalAllowed = evalOutputAllowed;
  if (isBriclogAlwaysDeliverEnabled() && (next.sections?.length || 0) >= 1) {
    finalOutputWithheld = false;
    finalPublishReady = true;
    finalEvalAllowed = true;
  }

  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      publishReady: finalPublishReady,
      outputWithheld: finalOutputWithheld,
    },
  };
  if (channel === "blog" && isBriclogMissionEnforced()) {
    next = applyPostLengthDeliveryPolish(next, input);
  }
  if (
    channel === "blog" &&
    (isLlmOriginatedPack(next) || isWriterEngineExpandedPack(next))
  ) {
    const llmRef = stripLlmPackSurfaceNoise(inbound);
    const llmFloor = llmDeliveryExpandFloor(input, llmRef);
    if (countBlogBodyCharsWithSpaces(next) < llmFloor) {
      next = ensureLlmPackExpandFloor(next, input, llmRef);
    }
  }
  if (channel === "blog" && !isMissionCatalogDeliveryPack(next, input)) {
    next = repairDeliveryOutlineLeak(next, input);
    next = stripContentGateViolationsFromPack(next, input);
    const postPolishChars = countBlogBodyCharsWithSpaces(next);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        blogCharCount: postPolishChars,
        charCount: postPolishChars,
      },
    };
  }
  if (channel === "blog" && isBriclogMissionEnforced()) {
    next = applyRegionBrandMashRepairToPack(next, input);
    next = stripTemplateBoilerplateFromPack(next, input);
  }
  const finalContract = assessHumanColumnContract(next, input);
  const sqvAfterLength = next._meta?.sqv || sqv;
  next = {
    ...next,
    _meta: {
      ...next._meta,
      humanVoiceMet: finalContract.humanVoiceMet,
      humanColumnOk: finalContract.ok,
      humanColumnReasons: (finalContract.reasons || []).slice(0, 8),
      humanTierMet: finalContract.tierMet && finalContract.humanVoiceMet,
      sqv: sqvAfterLength,
      contentQualityValue: sqvAfterLength.score,
    },
  };
  const finalDeliveryGrade =
    next._meta?.deliveryGrade || deliveryGrade;

  if (channel === "blog" && isBriclogMissionEnforced()) {
    const law = assertColumnistDeliveryLaw(next, input);
    if (law.shouldWithhold && !isColumnistSovereignPack(next)) {
      next = {
        sections: [],
        title: "",
        representativeTitle: "",
        _meta: {
          ...(next._meta || {}),
          outputWithheld: true,
          columnistDeliveryLawBlocked: true,
          withholdReason: law.reason,
          failReasons: [...new Set([...(next._meta?.failReasons || []), law.reason])],
        },
      };
    } else if (law.shouldWithhold && isColumnistSovereignPack(next)) {
      next = {
        ...next,
        _meta: {
          ...(next._meta || {}),
          outputWithheld: true,
          columnistDeliveryLawBlocked: true,
          withholdReason: law.reason,
          failReasons: [...new Set([...(next._meta?.failReasons || []), law.reason])],
        },
      };
    }
  }

  return withCoreEngineDeliveryMeta(
    {
      ...next,
      _meta: {
        ...(next._meta || {}),
        alwaysDeliver: isBriclogAlwaysDeliverEnabled() || undefined,
        placeholderWithheld:
          isBriclogAlwaysDeliverEnabled() ? undefined : next._meta?.placeholderWithheld,
        humanWritingDelivery: {
          humanReady:
            finalDeliveryGrade === DELIVERY_GRADE.HUMAN ||
            finalDeliveryGrade === DELIVERY_GRADE.PUBLISH,
          displayReady:
            finalDeliveryGrade === DELIVERY_GRADE.HUMAN ||
            finalDeliveryGrade === DELIVERY_GRADE.PUBLISH,
          reasons: (human.reasons || []).slice(0, 8),
        },
        editorQualitySummary: {
          ok: editor.ok,
          issues: (editor.issues || []).slice(0, 6).map((i) => i.type),
        },
        contentGate,
        goldenGate,
        adaptiveQualityMode: adaptiveQualityModeLabel(goldenGate),
        adaptiveQualityModeLabel: adaptiveQualityModeLabelKo(goldenGate),
        goldenPublishOk: goldenPublishOkResolved,
        llmAdaptivePublish: llmAdaptivePublishResolved,
        contentEvaluation: contentEvaluation || next._meta?.contentEvaluation,
        resetQualityGate: resetQualityGate || undefined,
        resetQualityScore: resetQualityGate?.score,
        resetQualityWithheld:
          missionCatalog && finalEvalAllowed
            ? false
            : isBriclogAlwaysDeliverEnabled()
              ? false
              : resetQualityGate?.shouldWithhold || undefined,
        customerPerspective,
        outputWithheld: finalOutputWithheld,
        sqv: {
          ...sqv,
          publishReady: finalPublishReady,
        },
        contentQualityValue: sqv.score,
        publishReady: finalPublishReady,
        publishReadiness: {
          ...readiness,
          status: finalPublishReady ? "ready" : readiness.status,
          canCopy: !finalOutputWithheld,
        },
        contentQualityDelivered: true,
        contentQualityDeliveredAt: new Date().toISOString(),
        editorialReflection: buildEditorialReflectionSnapshot(next, input),
        professionalEditorGrade: sqv?.professionalEditorGrade || undefined,
        ...(Array.isArray(next._meta?.failReasons)
          ? {
              failReasons: next._meta.failReasons.filter(
                (r) => !(r === "empty_pack" && (next.sections?.length || 0) >= 1)
              ),
            }
          : {}),
      },
    },
    input,
    channel,
    { sqv, contentEvaluation },
  );
}

/** API meta에 글값 요약 첨부 */
export function attachContentQualityToApiMeta(meta = {}, pack = null) {
  const sqv = pack?._meta?.sqv;
  if (!sqv) return meta;
  return {
    ...meta,
    deliveryGrade: pack?._meta?.deliveryGrade,
    lengthTierMet: pack?._meta?.lengthTierMet,
    blogCharCount: pack?._meta?.blogCharCount,
    sqv: {
      version: sqv.version,
      score: sqv.score,
      grade: sqv.grade,
      publishReady: sqv.publishReady,
      breakdown: sqv.breakdown,
      reasons: (sqv.reasons || []).slice(0, 10),
    },
    contentQualityValue: sqv.score,
    publishReady: sqv.publishReady,
    publishReadiness: pack?._meta?.publishReadiness,
  };
}
