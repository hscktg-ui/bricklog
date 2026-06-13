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
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import { finishChannelPack } from "@/lib/product/channelQualityStack";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { getChannelFullText } from "@/lib/content/channelPack";

export const BATCH_BELIEF_FLOOR = HUMAN_BELIEF_MIN_SCORE - 15;
export const BATCH_INFO_FLOOR = 65;
export const BATCH_QUALITY_CHAR_MIN = 820;
export const BATCH_CHANNEL_BELIEF_FLOOR = 44;
export const BATCH_CHANNEL_CHAR_MIN = 95;

function scoreBatchPack(pack, input, ctx) {
  const full = getBlogFullText(pack);
  return {
    full,
    belief: scoreHumanBelief(full, input, pack).score,
    info: scoreInformationYield(full, ctx, "blog"),
    chars: countBlogBodyCharsWithSpaces(pack),
  };
}

export function batchBlogCharsOk(chars, batchMin, belief, infoScore) {
  return (
    chars >= batchMin * 0.88 ||
    (belief >= BATCH_BELIEF_FLOOR &&
      infoScore >= BATCH_INFO_FLOOR &&
      chars >= BATCH_QUALITY_CHAR_MIN)
  );
}

export function batchBlogPassProxy(scored, batchMin) {
  const infoScore = scored.info.score;
  return (
    scored.belief >= BATCH_BELIEF_FLOOR &&
    (scored.info.ok || infoScore >= BATCH_INFO_FLOOR) &&
    batchBlogCharsOk(scored.chars, batchMin, scored.belief, infoScore)
  );
}

function batchCompositeScore(scored, batchMin) {
  const pass = batchBlogPassProxy(scored, batchMin);
  return (
    scored.belief +
    scored.info.score +
    Math.min(30, Math.round(scored.chars / 80)) +
    (pass ? 50 : 0)
  );
}

function cloneMeta(base = {}, scored, batchMin) {
  const sqvScore = Math.round((scored.belief + scored.info.score) / 2);
  return {
    ...base,
    humanBeliefScore: scored.belief,
    humanBelief: { score: scored.belief, ok: scored.belief >= BATCH_BELIEF_FLOOR },
    localBatchFinish: true,
    batchQualityShort: batchBlogCharsOk(
      scored.chars,
      batchMin,
      scored.belief,
      scored.info.score
    ),
    sqv: { score: sqvScore },
    contentQualityValue: sqvScore,
    informationYield: scored.info.score,
  };
}

/** dedup + topic scrub — salvage는 belief·info 동시 개선일 때만 */
function repairBatchInformationYield(pack, input, ctx, batchMin) {
  let scored = scoreBatchPack(pack, input, ctx);
  const needsRepair =
    !scored.info.ok &&
    (scored.info.score < BATCH_INFO_FLOOR ||
      (scored.info.reasons || []).includes("duplicate_killer_fail"));
  if (!needsRepair) {
    return pack;
  }

  let next = applyDuplicateKiller(pack, ctx, "blog");
  next = sanitizeVerbatimTopicInPack(next, input, "blog", { force: true });
  next = applyDuplicateKiller(next, ctx, "blog");

  scored = scoreBatchPack(next, input, ctx);
  if (scored.info.score >= BATCH_INFO_FLOOR) {
    return next;
  }

  const expanded = expandPackByInformation(next, ctx, input, {
    channel: "blog",
    minChars: batchMin,
    salvageForce: true,
  });
  const expandedScore = scoreBatchPack(expanded, input, ctx);
  if (
    expandedScore.info.score >= scored.info.score &&
    expandedScore.belief >= Math.max(BATCH_BELIEF_FLOOR, scored.belief - 6)
  ) {
    next = expanded;
  }

  return next;
}

function finishOneSeed(pack, input, ctx, batchMin) {
  let next = pack;
  next = applyHumanityFinishPass(next, ctx, "blog");
  next = weaveResearchFactsIntoPack(next, input);
  next = applySpeakerVoiceLockPack(next, input);
  next = repairThinSectionsAfterVoiceLock(next, input);

  if ((next.sections?.length || 0) < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }

  const candidates = [];
  const pushCandidate = (candidate) => {
    if (candidate?.sections?.length >= 3) {
      candidates.push(candidate);
    }
  };

  pushCandidate(next);
  const preExpand = next;
  const beliefBeforeExpand = scoreBatchPack(preExpand, input, ctx).belief;

  let expanded = expandLocalBlogPackForBatch(preExpand, input, batchMin);
  if (countBlogBodyCharsWithSpaces(expanded) < batchMin) {
    const rescued = expandRescueBlogPackToTarget(expanded, input, batchMin);
    if (countBlogBodyCharsWithSpaces(rescued) >= countBlogBodyCharsWithSpaces(expanded)) {
      expanded = rescued;
    }
  }

  const beliefAfterExpand = scoreBatchPack(expanded, input, ctx).belief;
  const beliefFloor = Math.max(BATCH_BELIEF_FLOOR, beliefBeforeExpand - 10);
  if (beliefAfterExpand >= beliefFloor) {
    pushCandidate(expanded);
  } else {
    pushCandidate(preExpand);
  }

  let repaired = repairBatchInformationYield(
    beliefAfterExpand >= beliefFloor ? expanded : preExpand,
    input,
    ctx,
    batchMin
  );
  repaired = applyLocalEditorBeliefPass(repaired);
  if ((repaired.sections?.length || 0) < 3) {
    repaired = ensureMinBlogSections(repaired, { input }, input, 3);
  }
  pushCandidate(repaired);

  let best = candidates[0] || pack;
  let bestScore = -1;
  for (const candidate of candidates) {
    const scored = scoreBatchPack(candidate, input, ctx);
    const composite = batchCompositeScore(scored, batchMin);
    if (composite > bestScore) {
      bestScore = composite;
      best = candidate;
    }
  }

  const scored = scoreBatchPack(best, input, ctx);
  return {
    ...best,
    _meta: cloneMeta(best._meta, scored, batchMin),
  };
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ targetChars?: number }} [options]
 */
export function finishLocalBlogPackForBatch(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  const ctx = { input, ...input };
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const batchMin =
    options.targetChars ??
    resolveLocalBatchBlogMinChars(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER, tier);

  return finishOneSeed(pack, input, ctx, batchMin);
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
