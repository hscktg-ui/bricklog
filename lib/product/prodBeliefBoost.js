/**
 * 프로덕션 송출 — human belief·분량 보강 (배치 엔진 재사용)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { getChannelFullText } from "@/lib/content/channelPack";
import {
  boostBatchBlogBelief,
  boostBatchChannelPack,
  weaveBatchPersonaVoice,
} from "@/lib/product/batchBeliefBoost";
import { applyEditorWriterLengthPass } from "@/lib/product/editorWriterDeliveryPass";

/** UI 송출 최소 belief — 배치 floor와 정렬 */
export const PROD_BELIEF_TARGET = 70;

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyProdBlogBeliefBoost(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const full = getBlogFullText(pack);
  let belief = scoreHumanBelief(full, input, pack).score;
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const needsBelief = belief < PROD_BELIEF_TARGET;
  const needsLength = chars < Math.round(tier.min * 0.55);

  if (!needsBelief && !needsLength) return pack;

  let next = pack;
  if (needsBelief) {
    next = boostBatchBlogBelief(next, input);
    next = weaveBatchPersonaVoice(next, input);
    belief = scoreHumanBelief(getBlogFullText(next), input, next).score;
  }

  if (needsLength || countBlogBodyCharsWithSpaces(next) < Math.round(tier.min * 0.55)) {
    next = applyEditorWriterLengthPass(next, input);
  }

  const outBelief = scoreHumanBelief(getBlogFullText(next), input, next).score;
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      prodBeliefBoost: true,
      humanBeliefScore: outBelief,
      prodBeliefBoostAt: new Date().toISOString(),
    },
  };
}

/** place·instagram — 배치와 동일 belief·발행 구조 보강 */
export const PROD_CHANNEL_BELIEF_TARGET = 58;

/**
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 * @param {object} input
 */
export function applyProdChannelBeliefBoost(pack, channel, input = {}) {
  if (!pack || (channel !== "place" && channel !== "instagram")) return pack;

  const belief = scoreHumanBelief(getChannelFullText(pack, channel), input, pack).score;
  if (belief >= PROD_CHANNEL_BELIEF_TARGET) return pack;

  const next = boostBatchChannelPack(pack, channel, input);
  const outBelief = scoreHumanBelief(
    getChannelFullText(next, channel),
    input,
    next
  ).score;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      prodChannelBeliefBoost: true,
      humanBeliefScore: outBelief,
      prodChannelBeliefBoostAt: new Date().toISOString(),
    },
  };
}
