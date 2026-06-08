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
} from "@/lib/content/researchGroundedHumanPack";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";

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
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        deliveryProseChars: chars,
        lengthTierMet: true,
      },
    };
  }

  if (shouldSuppressLengthTopoff(next, input)) {
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 12)
      : [];
    next = deepenMissionProseToMin(next, tier.min, input);
    chars = countBlogBodyCharsWithSpaces(next);
    let round = 0;
    while (chars < tier.min && round < 4) {
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
  } else {
    next = finalizeMissionProsePack(next, input, tier);
    chars = countBlogBodyCharsWithSpaces(next);
    for (let i = 0; i < 2 && chars < tier.min; i += 1) {
      next = finalizeMissionProsePack(next, input, tier);
      chars = countBlogBodyCharsWithSpaces(next);
    }
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryProseRefill: true,
      deliveryProseChars: chars,
      lengthTierMet: chars >= tier.min,
      lengthTierTarget: tier.min,
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

  let next = pack;
  if (isBriclogMissionEnforced()) {
    next = applySpeakerVoiceLockPack(next, input);
    if (channel === "blog") {
      next = ensureVerbatimTopicCompliance(next, input, "blog");
      if ((next.sections || []).length < 3) {
        next = ensureMinBlogSections(next, { input }, input, 3);
      }
      next = refillPackForDeliveryProse(next, input);
      next = repairDeliveryOutlineLeak(next, input);
      next = stripSearchSnippetLeakFromPack(next, input);
      next = applySpeakerVoiceLockPack(next, input);
      next = ensureVerbatimTopicCompliance(next, input, "blog");
      next = repairThinSectionsAfterVoiceLock(next, input);
    }
    next = applyPersonaEngineMetaPass(next, input);
  }

  const human = assessHumanWritingDelivery(next, input);
  const editor = detectEditorQualityIssues(next, { input }, input);
  next = stampContentQualityValue(next, input);
  const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const readiness = resolvePublishReadiness(next);

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
      sqv,
      contentQualityValue: sqv.score,
      publishReady: sqv.publishReady === true,
      publishReadiness: readiness,
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
