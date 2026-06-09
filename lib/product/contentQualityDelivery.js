/**
 * Content Quality Delivery — 글값(SQV) 최종 송출 SSOT
 * humanity · display · API 직전에 품질값을 한 번 더 확정한다.
 */
import {
  applySpeakerVoiceLockPack,
  repairThinSectionsAfterVoiceLock,
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
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  stampDeliveryGradeMeta,
  DELIVERY_GRADE,
  HUMAN_MIN_SECTIONS,
} from "@/lib/product/deliveryGrade";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import { guardPackAgainstShrink, withShrinkGuard } from "@/lib/product/packShrinkGuard";
import {
  detectOutlineLeak,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import {
  deepenDensityFirstPack,
  finalizeMissionProsePack,
} from "@/lib/product/missionProseEngine";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import {
  buildResearchFactLines,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { getBlogFullText } from "@/utils/qualityCheck";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { stripTitleEchoParagraphs } from "@/lib/llm/missionProseFallback";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { capTopicMentionsOnPack } from "@/lib/content/humanEditorGuardPass";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import { scoreInformationYield } from "@/lib/content/informationEngine";
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
import { polishLlmPackForDelivery, llmPackCharCount as llmCharsNoSpace } from "@/lib/golden/llmDeliveryPolish";

function isEditorialQualityPack(pack) {
  return (
    pack?._meta?.editorialQualityStandard === true ||
    pack?._meta?.editorialQualityReshape === true
  );
}

/** EQS 칼럼 — voice lock·density refill 없이 중복·placeholder만 정리 */
function finalizeEditorialQualityPackForDelivery(pack, input = {}) {
  const preservedClose = pack.conclusion;
  let next = pack;
  if ((next.sections || []).length < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }
  next = applyDeliveryProsePolish(next, input);
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

/** refill 후 패딩·중복·주제 spam 정리 */
function applyDeliveryProsePolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let next = stripTitleEchoParagraphs(pack);
  next = stripOpeningTitleRepeat(next);
  next = stripAdjacentDupesOnPack(next, input);
  next = applyDuplicateKiller(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = capTopicMentionsOnPack(next, input, 3);
  next = collapseMechanicalHookFlood(next, input);
  next = stripSearchSnippetLeakFromPack(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryProsePolish: true,
    },
  };
}

/** LLM light-path 보존 — short tier min(2,000) 미만이면 heavy polish */
const LLM_PRESERVE_MIN_CHARS = resolveBlogLengthTier("short").min;

export function isLlmOriginatedPack(pack, hints = {}) {
  if (pack?._meta?.llmGenerated === true) return true;
  const mode = String(
    pack?._meta?.generationMode ||
      hints?.meta?.generationMode ||
      hints?.mode ||
      ""
  );
  return (
    mode === "llm" ||
    mode.startsWith("llm_") ||
    mode === "llm_gate_preserved" ||
    mode === "llm_mission_delivery" ||
    mode === "llm_human_column"
  );
}

export function isWriterEngineExpandedPack(pack) {
  return Boolean(
    pack?._meta?.briclogWriterEngine ||
    pack?._meta?.llmHumanTierExpansion ||
    pack?._meta?.llmHumanColumnRewrite ||
    pack?._meta?.writerEngineExpanded ||
    pack?._meta?.writerEngineRewritten ||
    pack?._meta?.writerEngineVoicePolished
  );
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

/** Mission·LLM·로컬 fallback — 검수 미통과여도 화면 배달 허용 */
export function isCustomerPreviewDeliverablePack(pack, hints = {}) {
  if (isLlmOriginatedPack(pack, hints)) return true;
  if (pack?._meta?.missionProseFallback) return true;
  if (pack?._meta?.draftFallback || hints?.meta?.draftFallback) return true;
  if (pack?._meta?.deliveryRescue) return true;
  if (pack?._meta?.editorialQualityStandard) return true;
  if (
    hints?.mode === "guaranteed_mission_delivery" ||
    hints?.mode === "client_mission_rescue" ||
    hints?.mode === "research_gate_rescue" ||
    hints?.mode === "research_gate_stamped"
  ) {
    return true;
  }
  return false;
}

function llmPackCharCount(pack) {
  return llmCharsNoSpace(pack);
}

/** LLM·조사 원고는 템플릿 리필 대신 보존 — 길이·정보 밀도가 심각할 때만 보강 */
function needsDeliveryProseRefill(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const yieldScore = scoreInformationYield(getBlogFullText(pack), { input }, "blog");

  if (isLlmOriginatedPack(pack) && llmPackCharCount(pack) >= LLM_PRESERVE_MIN_CHARS) {
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
  next = stripSearchSnippetLeakFromPack(next, input);
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

  const inbound = pack;
  const inboundChars = countBlogBodyCharsWithSpaces(pack);
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
    isLlmBlogPath && llmPackCharCount(pack) >= LLM_PRESERVE_MIN_CHARS;
  let next = pack;
  if (isBriclogMissionEnforced()) {
    if (isLlmBlogPath) {
      next = stripSearchSnippetLeakFromPack(next, input);
      next = stripContentGateViolationsFromPack(next, input);
      next = polishLlmPackForDelivery(next, input);
      if (!llmHumanReadyPath) {
        if ((next.sections || []).length < HUMAN_MIN_SECTIONS) {
          next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
        }
        if (needsDeliveryProseRefill(next, input)) {
          next = refillPackForDeliveryProse(next, input);
        }
        if (countBlogBodyCharsWithSpaces(next) < tier.min) {
          next = ensureMissionProseTierLength(next, { input });
        }
      }
      next = applyDeliveryProsePolish(next, input);
      next = applyHumanVoiceDeliveryPass(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
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
        (p) => stripSearchSnippetLeakFromPack(p, input),
        { stage: "stripSearchSnippet" }
      );
      if (!missionFallbackPack) {
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
      if (needsDeliveryProseRefill(next, input)) {
        next = refillPackForDeliveryProse(next, input);
      }
      next = applyDeliveryProsePolish(next, input);
      next = withShrinkGuard(
        next,
        (p) => stripSearchSnippetLeakFromPack(p, input),
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
  }

  if (channel === "blog" && inboundChars > 0 && !isEditorialQualityPack(next) && !isLlmBlogPath) {
    const outChars = countBlogBodyCharsWithSpaces(next);
    if (
      outChars < Math.max(inboundChars * 0.92, tier.min * 0.75) &&
      needsDeliveryProseRefill(next, input)
    ) {
      next = refillPackForDeliveryProse(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
      next = repairThinSectionsAfterVoiceLock(next, input);
    }
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

    if (goldenGate.shouldRevise || goldenGate.shouldRegen) {
      next = applyGoldenSafeEdit(next, input);
      goldenGate = assessGoldenQualityGate(next, input);
    }

    if (
      !isLlmBlogPath &&
      (goldenGate.shouldRevise || goldenGate.shouldRegen) &&
      shouldUseEditorialQualityPath(input)
    ) {
      next = applyEditorialQualityStandard(next, input);
      next = finalizeEditorialQualityPackForDelivery(next, input);
      next = applyGoldenSafeEdit(next, input);
      goldenGate = assessGoldenQualityGate(next, input);
    }
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

  const human = assessHumanWritingDelivery(next, input);
  const editor = detectEditorQualityIssues(next, { input }, input);
  next = stampContentQualityValue(next, input);
  const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const contentGate =
    channel === "blog" ? assessContentGate(next, input) : { ok: true, score: 100, shouldWithhold: false };
  const goldenGate =
    channel === "blog"
      ? next._meta?.goldenGate || assessGoldenQualityGate(next, input)
      : { ok: true, score: 100, verdict: "pass", shouldRegen: false };
  const readiness = resolvePublishReadiness(next);

  const goldenPublishOk = resolveGoldenPublishOk(goldenGate, next);
  const llmAdaptivePublish = resolveLlmAdaptivePublishReady(next, { goldenGate, contentGate });
  let publishReady =
    goldenPublishOk &&
    (llmAdaptivePublish ||
      (sqv.publishReady === true && contentGate.ok && !contentGate.shouldWithhold));

  next = guardPackAgainstShrink(inbound, next, { stage: "contentQualityDelivery" });
  next = stampDeliveryGradeMeta(next, input);
  const deliveryGrade = next._meta?.deliveryGrade || DELIVERY_GRADE.DRAFT;

  if (deliveryGrade !== DELIVERY_GRADE.PUBLISH) {
    publishReady = false;
  }
  if (deliveryGrade === DELIVERY_GRADE.DRAFT) {
    publishReady = false;
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanWritingDelivery: {
        humanReady:
          deliveryGrade === DELIVERY_GRADE.HUMAN ||
          deliveryGrade === DELIVERY_GRADE.PUBLISH,
        displayReady:
          deliveryGrade === DELIVERY_GRADE.HUMAN ||
          deliveryGrade === DELIVERY_GRADE.PUBLISH,
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
      goldenPublishOk,
      llmAdaptivePublish,
      outputWithheld: publishReady
        ? false
        : contentGate.shouldWithhold === true ||
          goldenGate.shouldBlock === true ||
          goldenGate.shouldRegen === true,
      sqv: {
        ...sqv,
        publishReady,
      },
      contentQualityValue: sqv.score,
      publishReady,
      publishReadiness: {
        ...readiness,
        status: publishReady
          ? "ready"
          : deliveryGrade === DELIVERY_GRADE.DRAFT
            ? "polishing"
          : contentGate.shouldWithhold || goldenGate.shouldRegen
            ? "blocked"
            : goldenGate.verdict === "revise"
              ? "revise"
              : readiness.status,
        canCopy: deliveryGrade !== DELIVERY_GRADE.DRAFT || inboundChars >= 80,
      },
      contentQualityDelivered: true,
      contentQualityDeliveredAt: new Date().toISOString(),
    },
  };
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
