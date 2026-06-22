/**
 * 폴백·구조 패스 직후 사람이 쓴 글 마감 — ensure*Delivery 우회 경로 SSOT
 */
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import {
  weaveResearchFactsIntoPack,
  weaveResearchFactsIntoChannelPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { isResearchGroundedDeliveryPack } from "@/lib/content/missionProseGate";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { finishChannelPackForDelivery } from "@/lib/product/channelQualityStack";
import { applyProdChannelBeliefBoost } from "@/lib/product/prodBeliefBoost";
import { applyAGradeChannelPass } from "@/lib/product/aGradeDeliveryEngine";
import { stampCoreEngineDeliveryMeta } from "@/lib/product/briclogCoreEngine";

function mergeInput(input = {}) {
  return { input, ...input, skipDeliveryFinalize: true };
}

function shouldSkipBlogColumnPolish(pack) {
  return Boolean(pack?._meta?.humanProseFallbackFinish);
}

function finalizeChannelPack(channel, pack, input = {}) {
  if (!pack || (channel !== "place" && channel !== "instagram")) return pack;
  let next = finishChannelPackForDelivery(channel, pack, {
    input,
    sourceChannel: input.sourceChannel,
    ...input,
  });
  next = applyProdChannelBeliefBoost(next, channel, input);
  next = applyAGradeChannelPass(next, channel, input);
  try {
    next = stampCoreEngineDeliveryMeta(next, input, channel);
  } catch {
    /* optional */
  }
  return next;
}

/**
 * 블로그 폴백·weave 직후 — humanity + 칼럼 prose (조사 weave 포함)
 */
export function finishBlogFallbackHumanProse(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (pack._meta?.humanProseFallbackFinish) return pack;

  let next = pack;
  if (hasUsableResearchFacts(input) && !pack._meta?.researchGroundedHumanPack) {
    next = weaveResearchFactsIntoPack(next, input);
  }
  next = applyDuplicateKiller(next, mergeInput(input), "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = applyHumanityFinishPass(next, mergeInput(input), "blog");
  if (
    !pack._meta?.researchGroundedHumanPack &&
    !isResearchGroundedDeliveryPack(pack, input) &&
    !shouldSkipBlogColumnPolish(next)
  ) {
    next = applyHumanColumnProsePass(next, input, { force: true, lightAnchors: true });
  }
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanProseFallbackFinish: true,
    },
  };
}

/**
 * 플레이스·인스타 폴백 직후 — story gate + humanity + 조사 weave + 채널 마감
 */
export function finishChannelFallbackHumanProse(
  pack,
  channel,
  input = {},
  { storyGate = true, deliveryFinalize = true } = {}
) {
  if (!pack || (channel !== "place" && channel !== "instagram")) return pack;
  if (pack._meta?.humanProseFallbackFinish && deliveryFinalize) return pack;

  let next = pack;
  if (storyGate) {
    next = applyChannelStoryGate(next, channel, mergeInput(input));
  }
  next = applyHumanityFinishPass(next, mergeInput(input), channel);
  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoChannelPack(next, channel, input);
  }
  if (deliveryFinalize) {
    next = finalizeChannelPack(channel, next, input);
  }
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanProseFallbackFinish: true,
    },
  };
}
