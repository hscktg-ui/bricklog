/**
 * BRICLOG Humanity Finish Pass — 고객 출력 직전 휴머니티 최우선 보정
 * 글자수 패딩 없이: 중복 제거 → 칼럼 톤 → 대화체 → 서사 → Belief 판정
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { applyDuplicateKiller, stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { applyHumanColumnPolish } from "@/lib/content/humanColumnPolishEngine";
import { applyMagazineArcPolish } from "@/lib/content/columnMagazineArchetype";
import {
  applyHumanConversationalVoice,
  ensureHumanConversationalBookends,
} from "@/lib/content/humanConversationalVoice";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate";
import {
  applyHumanBeliefGate,
  applyLocalEditorBeliefPass,
  applyLocalEditorBeliefPassToText,
} from "@/lib/content/humanBeliefGate";
import {
  applyNarrativeBeliefPass,
  shouldApplyNarrativeBeliefPass,
} from "@/lib/content/narrativeBeliefPass";
import {
  HUMAN_BELIEF_MIN_SCORE,
  isHumanBeliefEnforced,
  scoreHumanBelief,
} from "@/lib/product/humanBeliefEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_DUPLICATE_POLICY } from "@/lib/product/briclogUltimateV20";
import { applyHumanityCommonSensePass } from "@/lib/product/humanityCommonSenseEngine";
import { applyContentQualityMetaPass } from "@/lib/product/contentQualityEngine";
import { applyEditorV95Pass } from "@/lib/product/briclogEditorEngineV95";
import {
  stripCatalogContaminationFromBlogPack,
  stripCatalogContaminationFromChannelPack,
} from "@/lib/product/catalogContaminationGuard";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";
import { enforceSmartPlaceOwnerNotice } from "@/lib/channel/smartPlaceNoticeGuard";
import {
  applyHumanEditorGuardPass,
  capTopicMentionsOnPack,
} from "@/lib/content/humanEditorGuardPass";
import { applyEditorHumanizationPack } from "@/lib/product/editorHumanizationEngine";
import { applyDeepLearningPack } from "@/lib/product/deepLearningEngine";
import { applyRegionVoiceLockToPack } from "@/lib/content/regionVoiceLock";
import { ensureHumanStoryOpeningBody } from "@/lib/product/humanStoryEngine";
import {
  applyChannelPersonaMetaPass,
  applyPersonaEngineMetaPass,
} from "@/lib/persona/personaEngineProfile";
import { applyChannelQualityStack } from "@/lib/product/channelQualityStack";
import {
  applyChannelMarketerPack,
  detectChannelMarketerIssues,
} from "@/lib/content/channelMarketerEngine";
import { deepenMissionProsePack, finalizeMissionProsePack } from "@/lib/product/missionProseEngine";
import { buildResearchFactLines } from "@/lib/content/researchGroundedHumanPack";
import { applyFurnitureExhibitionPackPolish, isFurnitureExhibitionContext } from "@/lib/product/furnitureExhibitionEngine";
import { applySpeakerVoiceLockPack } from "@/lib/persona/speakerVoiceLock";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import { applyHaeyoConsistencyToPack } from "@/lib/content/haeyoConsistencyGate";
import { applyMissionOutputSanitizerPack } from "@/lib/product/missionOutputSanitizer";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery";
import {
  assessContentExplainabilityForPublish,
} from "@/lib/product/briclogContentDoctrine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  applyInformationalTopicPackGate,
  stripBlogPackHashtags,
} from "@/lib/content/informationalTopicPackGate";
import { isInformationalTopicInput, isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";
import { applyVisitReviewTopicPackGate } from "@/lib/content/visitReviewTopicGate";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import { applyGpt55HumanityLightFinish, shouldUseGpt55LightDelivery } from "@/lib/product/gpt55LightDelivery";

const NARRATIVE_RETRY_SCORE = 78;

function applyDuplicateHumanity(pack, ctx, channel = "blog") {
  const dupCtx = {
    ...ctx,
    similarityPercent: HUMAN_DUPLICATE_POLICY.similarityPercent,
  };
  let next = applyDuplicateKiller(pack, dupCtx, channel);
  if (channel === "blog") {
    next = stripGlobalExactDuplicateSentences(next);
    return applyDuplicateKiller(next, dupCtx, channel);
  }
  return next;
}

function hasPackForChannel(pack, channel) {
  if (!pack) return false;
  if (channel === "place") {
    return Boolean(
      String(pack.title || "").trim() ||
        String(pack.shortNotice || "").trim() ||
        String(pack.detailBody || "").trim()
    );
  }
  if (channel === "instagram") {
    return Boolean(
      String(pack.body || pack.lineBreakBody || "").trim() ||
        String(pack.hook || "").trim()
    );
  }
  return Boolean(pack.sections?.length);
}

function applyChannelLocalBeliefPass(pack, channel) {
  if (channel === "place") {
    return {
      ...pack,
      shortNotice: pack.shortNotice
        ? applyLocalEditorBeliefPassToText(pack.shortNotice)
        : pack.shortNotice,
      detailBody: pack.detailBody
        ? applyLocalEditorBeliefPassToText(pack.detailBody)
        : pack.detailBody,
    };
  }
  if (channel === "instagram") {
    const bodyField = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      hook: pack.hook ? applyLocalEditorBeliefPassToText(pack.hook) : pack.hook,
      [bodyField]: pack[bodyField]
        ? applyLocalEditorBeliefPassToText(pack[bodyField])
        : pack[bodyField],
      ending: pack.ending
        ? applyLocalEditorBeliefPassToText(pack.ending)
        : pack.ending,
    };
  }
  return pack;
}

function applyChannelHumanityFinish(pack, ctx, channel) {
  const input = ctx.input || ctx;
  const fullCtx = { ...ctx, input };

  let next = applyDuplicateHumanity(pack, fullCtx, channel);
  next = applyEditorV95Pass(next, fullCtx, input);
  next = applyHumanityCommonSensePass(next, fullCtx, input);
  next = applyChannelQualityStack(next, channel, fullCtx);
  next = applyChannelPersonaMetaPass(next, input);
  next = applyChannelLocalBeliefPass(next, channel);
  next = applyDuplicateHumanity(next, fullCtx, channel);

  next = stripCatalogContaminationFromChannelPack(next, channel);
  if (channel === "place") {
    next = enforceSmartPlaceOwnerNotice(next, input);
  }

  const full = getChannelFullText(next, channel);
  const belief = next._meta?.humanBelief || scoreHumanBelief(full, input, next);
  const marketer = detectChannelMarketerIssues(next, channel, fullCtx, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanityFinishPass: {
        applied: true,
        channel,
        beliefScore: belief.score,
        beliefOk: belief.ok,
        channelMarketerGate: marketer,
        channelQualityStack: true,
      },
      humanBeliefScore: belief.score,
      humanBelief: belief,
      personaAligned: next._meta?.personaAligned,
      displayReady: next._meta?.channelFirstDelivery?.displayReady,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {"blog"|"place"|"instagram"} [channel]
 */
export function applyHumanityFinishPass(pack, ctx = {}, channel = "blog") {
  if (!hasPackForChannel(pack, channel)) return pack;
  if (channel === "image") return pack;
  if (!isHumanBeliefEnforced() && !isBriclogMissionEnforced()) return pack;

  if (channel === "place" || channel === "instagram") {
    return applyChannelHumanityFinish(pack, ctx, channel);
  }

  const input = ctx.input || ctx;
  if (shouldUseGpt55LightDelivery(pack, input)) {
    return applyGpt55HumanityLightFinish(pack, ctx, channel);
  }

  const fullCtx = { ...ctx, input };
  const explainGate = assessContentExplainabilityForPublish(input);
  const mayLengthRefill = explainGate.ok;

  let next = applyDuplicateHumanity(pack, fullCtx, channel);
  next = applyEditorV95Pass(next, fullCtx, input);
  next = applyHumanityCommonSensePass(next, fullCtx, input);

  next = applyHumanColumnPolish(next, input);
  next = applyMagazineArcPolish(next, input);
  next = applyHumanConversationalVoice(next, input);
  next = ensureHumanConversationalBookends(next, input);
  next = applyEditorialPackGate(next, fullCtx);
  next = applyLocalEditorBeliefPass(next);

  let belief = scoreHumanBelief(getBlogFullText(next), input, next);
  const needsNarrative =
    shouldApplyNarrativeBeliefPass(next, fullCtx) ||
    belief.score < NARRATIVE_RETRY_SCORE ||
    !belief.ok;

  if (needsNarrative) {
    next = applyNarrativeBeliefPass(next, fullCtx);
    next = applyHumanConversationalVoice(next, input);
    next = ensureHumanConversationalBookends(next, input);
  }

  next = applyDuplicateHumanity(next, fullCtx, channel);
  next = applyHumanBeliefGate(next, fullCtx);
  next = applyPersonaEngineMetaPass(next, input);
  next = applyContentQualityMetaPass(next, fullCtx, input);
  next = applyRegionVoiceLockToPack(next, input);
  next = applyHumanEditorGuardPass(next, fullCtx, input);
  next = applyEditorHumanizationPack(next, input);
  next = applyRegionVoiceLockToPack(next, input);
  next = applyDuplicateHumanity(next, fullCtx, channel);

  if (next?.sections?.[0]?.body) {
    next = {
      ...next,
      sections: [
        {
          ...next.sections[0],
          body: ensureHumanStoryOpeningBody(next.sections[0].body, input),
        },
        ...next.sections.slice(1),
      ],
    };
  }

  belief = next._meta?.humanBelief || scoreHumanBelief(getBlogFullText(next), input, next);
  if (!belief.ok && belief.score < HUMAN_BELIEF_MIN_SCORE) {
    next = applyNarrativeBeliefPass(next, fullCtx);
    next = applyLocalEditorBeliefPass(next);
    next = applyHumanBeliefGate(next, fullCtx);
  }

  if (
    isBriclogMissionEnforced() &&
    next?.sections?.length &&
    mayLengthRefill &&
    !shouldSuppressLengthTopoff(next, input)
  ) {
    const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
    let bodyChars = countBlogBodyCharsWithSpaces(next);
    let refillRound = 0;
    while (bodyChars < tier.min && refillRound < 4) {
      next = finalizeMissionProsePack(next, input, tier);
      bodyChars = countBlogBodyCharsWithSpaces(next);
      refillRound += 1;
      next = {
        ...next,
        _meta: {
          ...(next._meta || {}),
          missionProseTierRefill: true,
          missionProseTierRefillRounds: refillRound,
        },
      };
    }
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        lengthTierMet: bodyChars >= tier.min,
        missionProseTierOk: bodyChars >= tier.min,
        missionProseChars: bodyChars,
        lengthTierTarget: tier.min,
      },
    };
  }

  next = applyDeepLearningPack(next, input);

  if (isFurnitureExhibitionContext(input)) {
    next = applyFurnitureExhibitionPackPolish(next, input);
    next = applyHumanWriterHeadingGate(next, { input });
    next = applyHaeyoConsistencyToPack(next);
  }

  next = applySpeakerVoiceLockPack(next, input);
  next = applyPersonaEngineMetaPass(next, input);

  next = capTopicMentionsOnPack(next, input, 4);
  next = applyMissionOutputSanitizerPack(next, input);
  next = applyContentQualityMetaPass(next, fullCtx, input);
  next = applyMissionOutputSanitizerPack({
    ...next,
    _meta: { ...(next._meta || {}), missionOutputSanitizerForce: true },
  }, input);

  if (
    isBriclogMissionEnforced() &&
    next?.sections?.length &&
    mayLengthRefill &&
    !shouldSuppressLengthTopoff(next, input)
  ) {
    const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
    let bodyChars = countBlogBodyCharsWithSpaces(next);
    let postSanitizeRefill = 0;
    while (bodyChars < tier.min && postSanitizeRefill < 4) {
      next = finalizeMissionProsePack(next, input, tier);
      bodyChars = countBlogBodyCharsWithSpaces(next);
      postSanitizeRefill += 1;
    }
    let tightenGuard = 0;
    while (tightenGuard < 4) {
      next = applyMissionOutputSanitizerPack(
        {
          ...next,
          _meta: { ...(next._meta || {}), missionOutputSanitizerForce: true },
        },
        input
      );
      bodyChars = countBlogBodyCharsWithSpaces(next);
      if (bodyChars >= tier.min) break;
      next = deepenMissionProsePack(next, tier.min, input, {
        polishAfter: true,
        seedOffset: tightenGuard,
      });
      tightenGuard += 1;
    }

    next = capTopicMentionsOnPack(next, input, 4);
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        lengthTierMet: bodyChars >= tier.min,
        missionProseTierOk: bodyChars >= tier.min,
        missionProseChars: bodyChars,
        lengthTierTarget: tier.min,
        missionPostSanitizeRefillRounds: postSanitizeRefill,
      },
    };
  }

  if (
    isBriclogMissionEnforced() &&
    next?.sections?.length &&
    mayLengthRefill &&
    !shouldSuppressLengthTopoff(next, input)
  ) {
    const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
    let bodyChars = countBlogBodyCharsWithSpaces(next);
    let finalTopoff = 0;
    while (bodyChars < tier.min && finalTopoff < 12) {
      next = deepenMissionProsePack(next, tier.min, input, {
        polishAfter: true,
        seedOffset: finalTopoff,
      });
      bodyChars = countBlogBodyCharsWithSpaces(next);
      finalTopoff += 1;
    }
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        lengthTierMet: bodyChars >= tier.min,
        missionProseTierOk: bodyChars >= tier.min,
        missionProseChars: bodyChars,
        missionFinalTopoffRounds: finalTopoff,
      },
    };
  }

  if (
    isBriclogMissionEnforced() &&
    next?.sections?.length &&
    mayLengthRefill &&
    shouldSuppressLengthTopoff(next, input)
  ) {
    const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
    let bodyChars = countBlogBodyCharsWithSpaces(next);
    if (bodyChars < tier.min) {
      let refill = 0;
      const researchLines = buildResearchFactLines(input, 8);
      while (bodyChars < tier.min && refill < 12) {
        next = deepenMissionProsePack(next, tier.min, input, {
          polishAfter: true,
          seedOffset: refill,
          researchLines,
        });
        bodyChars = countBlogBodyCharsWithSpaces(next);
        refill += 1;
      }
      next = {
        ...next,
        _meta: {
          ...(next._meta || {}),
          densityFirstPostHumanityRefill: true,
          lengthTierMet: bodyChars >= tier.min,
          missionProseTierOk: bodyChars >= tier.min,
          missionProseChars: bodyChars,
          lengthTierTarget: tier.min,
        },
      };
    }
  }

  if (isInformationalTopicInput(input)) {
    next = applyInformationalTopicPackGate(next, input);
  } else if (isVisitReviewTopicInput(input)) {
    next = applyVisitReviewTopicPackGate(next, input);
  }
  next = stripBlogPackHashtags(next);
  next = applyDisplayBodyGuardPack(next, input);
  next = applyMissionOutputSanitizerPack(next, input);
  if (shouldPreserveGpt55LlmPackBody(next, input)) {
    next = stripCatalogContaminationFromBlogPack(next);
  }
  next = finalizeContentQualityForDelivery(next, input, "blog");

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanityFinishPass: {
        applied: true,
        beliefScore: next._meta?.humanBeliefScore ?? belief.score,
        beliefOk: next._meta?.humanBelief?.ok ?? belief.ok,
      },
    },
  };
}
