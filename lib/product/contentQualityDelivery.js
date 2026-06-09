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
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
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

const LLM_PRESERVE_MIN_CHARS = 450;

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
    mode === "llm_mission_delivery"
  );
}

export function hasSubstantiveLlmBody(pack, minChars = 200) {
  if (!pack?.sections?.length) return false;
  return countBlogBodyCharsWithSpaces(pack) >= minChars;
}

/** Mission·LLM·로컬 fallback — 검수 미통과여도 화면 배달 허용 */
export function isCustomerPreviewDeliverablePack(pack, hints = {}) {
  if (isLlmOriginatedPack(pack, hints)) return true;
  if (pack?._meta?.missionProseFallback) return true;
  if (pack?._meta?.draftFallback || hints?.meta?.draftFallback) return true;
  return false;
}

function llmPackCharCount(pack) {
  return llmCharsNoSpace(pack);
}

/** LLM·조사 원고는 템플릿 리필 대신 보존 — 길이·정보 밀도가 심각할 때만 보강 */
function needsDeliveryProseRefill(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
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
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
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
export function finalizeContentQualityForDelivery(pack, input = {}, channel = "blog") {
  if (!pack?.sections?.length) return pack;

  const inboundChars = countBlogBodyCharsWithSpaces(pack);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const editorialInbound = channel === "blog" && isEditorialQualityPack(pack);
  const llmLightPath =
    channel === "blog" &&
    isLlmOriginatedPack(pack) &&
    llmPackCharCount(pack) >= LLM_PRESERVE_MIN_CHARS;
  let next = pack;
  if (isBriclogMissionEnforced()) {
    if (llmLightPath) {
      next = stripSearchSnippetLeakFromPack(next, input);
      next = stripContentGateViolationsFromPack(next, input);
      next = polishLlmPackForDelivery(next, input);
      next = applyDeliveryProsePolish(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
    } else if (editorialInbound) {
      next = finalizeEditorialQualityPackForDelivery(next, input);
    } else if (channel === "blog") {
      next = ensureVerbatimTopicCompliance(next, input, "blog");
      if ((next.sections || []).length < 3) {
        next = ensureMinBlogSections(next, { input }, input, 3);
      }
      next = repairDeliveryOutlineLeak(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
      next = applySpeakerVoiceLockPack(next, input);
      next = ensureVerbatimTopicCompliance(next, input, "blog");
      next = repairThinSectionsAfterVoiceLock(next, input);
      if (needsDeliveryProseRefill(next, input)) {
        next = refillPackForDeliveryProse(next, input);
      }
      next = applyDeliveryProsePolish(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
      next = repairDeliveryOutlineLeak(next, input);
      next = repairThinSectionsAfterVoiceLock(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
      if ((next.sections || []).length < 3) {
        next = ensureMinBlogSections(next, { input }, input, 3);
        next = repairThinSectionsAfterVoiceLock(next, input);
      }
    } else {
      next = applySpeakerVoiceLockPack(next, input);
    }
    next = applyPersonaEngineMetaPass(next, input);
  }

  if (channel === "blog" && inboundChars > 0 && !isEditorialQualityPack(next) && !llmLightPath) {
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
    next = stripContentGateViolationsFromPack(next, input);
    let gateProbe = assessContentGate(next, input);
    if (!llmLightPath && !gateProbe.ok && shouldUseEditorialQualityPath(input)) {
      next = applyEditorialQualityStandard(next, input);
      next = finalizeEditorialQualityPackForDelivery(next, input);
    }

    let goldenGate = assessGoldenQualityGate(next, input);

    if (goldenGate.shouldRevise || goldenGate.shouldRegen) {
      next = applyGoldenSafeEdit(next, input);
      goldenGate = assessGoldenQualityGate(next, input);
    }

    if (
      !llmLightPath &&
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
        llmDeliveryLightPath: llmLightPath || undefined,
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
  const publishReady =
    goldenPublishOk &&
    (llmAdaptivePublish ||
      (sqv.publishReady === true && contentGate.ok && !contentGate.shouldWithhold));

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanWritingDelivery: {
        humanReady: human.humanReady,
        displayReady: human.displayReady,
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
          : contentGate.shouldWithhold || goldenGate.shouldRegen
            ? "blocked"
            : goldenGate.verdict === "revise"
              ? "revise"
              : readiness.status,
        canCopy: publishReady,
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
