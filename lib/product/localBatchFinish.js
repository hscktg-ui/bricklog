/**
 * 로컬 배치·크로스채널 SSOT — LLM 없이 blog/place/insta 품질 finish
 */
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import {
  expandLocalBlogPackForBatch,
  expandRescueBlogPackToTarget,
  resolveLocalBatchBlogMinChars,
} from "@/lib/content/missionProseGate";
import { applyLocalEditorBeliefPass } from "@/lib/content/humanBeliefGate";
import {
  applySpeakerVoiceLockPack,
  repairThinSectionsAfterVoiceLock,
} from "@/lib/persona/speakerVoiceLock";
import { weaveResearchFactsIntoPack } from "@/lib/content/researchGroundedHumanPack";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import { finishChannelPack } from "@/lib/product/channelQualityStack";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { getChannelFullText } from "@/lib/content/channelPack";

function scoreBatchPack(pack, input, ctx) {
  const full = getBlogFullText(pack);
  return {
    full,
    belief: scoreHumanBelief(full, input, pack).score,
    info: scoreInformationYield(full, ctx, "blog"),
    chars: countBlogBodyCharsWithSpaces(pack),
  };
}

/** density-first 확장이 만든 중복·토픽 반복 — 정보량 미달 시에만 dedup + salvage coverage */
function repairBatchInformationYield(pack, input, ctx, batchMin) {
  let scored = scoreBatchPack(pack, input, ctx);
  if (scored.info.ok || scored.info.score >= 68) {
    return pack;
  }

  let next = applyDuplicateKiller(pack, ctx, "blog");
  next = sanitizeVerbatimTopicInPack(next, input, "blog", { force: true });
  next = applyDuplicateKiller(next, ctx, "blog");

  scored = scoreBatchPack(next, input, ctx);
  const expanded = expandPackByInformation(next, ctx, input, {
    channel: "blog",
    minChars: batchMin,
    salvageForce: true,
  });
  const expandedScore = scoreBatchPack(expanded, input, ctx);
  if (expandedScore.info.score >= scored.info.score) {
    next = expanded;
  }

  return next;
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ targetChars?: number }} [options]
 */
export function finishLocalBlogPackForBatch(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  const ctx = { input, ...input };
  let next = pack;

  next = applyHumanityFinishPass(next, ctx, "blog");
  next = weaveResearchFactsIntoPack(next, input);
  next = applySpeakerVoiceLockPack(next, input);
  next = repairThinSectionsAfterVoiceLock(next, input);

  if ((next.sections?.length || 0) < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }

  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const batchMin =
    options.targetChars ??
    resolveLocalBatchBlogMinChars(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER, tier);

  const preExpand = next;
  const beliefBeforeExpand = scoreHumanBelief(getBlogFullText(preExpand), input, preExpand).score;
  const charsBeforeExpand = countBlogBodyCharsWithSpaces(preExpand);

  next = expandLocalBlogPackForBatch(preExpand, input, batchMin);
  if (countBlogBodyCharsWithSpaces(next) < batchMin) {
    const rescued = expandRescueBlogPackToTarget(next, input, batchMin);
    if (countBlogBodyCharsWithSpaces(rescued) >= countBlogBodyCharsWithSpaces(next)) {
      next = rescued;
    }
  }

  const beliefAfterExpand = scoreHumanBelief(getBlogFullText(next), input, next).score;
  const beliefFloor = Math.max(63, beliefBeforeExpand - 10);
  if (beliefAfterExpand < beliefFloor) {
    next = preExpand;
  }

  next = repairBatchInformationYield(next, input, ctx, batchMin);
  next = applyLocalEditorBeliefPass(next);

  if ((next.sections?.length || 0) < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }

  const scored = scoreBatchPack(next, input, ctx);
  const sqvScore = Math.round((scored.belief + scored.info.score) / 2);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanBeliefScore: scored.belief,
      humanBelief: { score: scored.belief, ok: scored.belief >= 63 },
      localBatchFinish: true,
      beliefSafeShort:
        scored.belief >= 63 &&
        scored.info.score >= 68 &&
        charsBeforeExpand >= 820 &&
        beliefAfterExpand < beliefFloor,
      sqv: { score: sqvScore },
      contentQualityValue: sqvScore,
      informationYield: scored.info.score,
    },
  };
}

/**
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 * @param {object} input
 */
export function finishLocalChannelPackForBatch(pack, channel, input = {}) {
  if (!pack) return pack;
  const ctx = { input, ...input };
  let next = weaveResearchFactsIntoChannelPack(pack, channel, input);
  const minChars = channel === "instagram" ? 240 : 180;
  let textLen = getChannelFullText(next, channel).replace(/\s/g, "").length;
  for (let round = 0; round < 3 && textLen < minChars; round += 1) {
    next = expandPackByInformation(next, ctx, input, {
      channel,
      minChars,
      salvageForce: true,
    });
    textLen = getChannelFullText(next, channel).replace(/\s/g, "").length;
  }
  next = finishChannelPack(channel, next, ctx);
  return next;
}
