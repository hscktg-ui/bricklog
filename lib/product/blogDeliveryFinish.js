/**
 * Prod 블로그 송출 — 배치 rescueBatchBelief 경량 이식 (persona fallback 없음)
 */
import {
  applyLocalEditorBeliefPass,
} from "@/lib/content/humanBeliefGate";
import { applyNarrativeBeliefPass } from "@/lib/content/narrativeBeliefPass";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { getBlogFullText } from "@/utils/qualityCheck";

export const DELIVERY_BELIEF_FLOOR = HUMAN_BELIEF_MIN_SCORE - 15;

/**
 * @param {object} pack
 * @param {object} input
 */
export function finishBlogPackForDelivery(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const ctx = { input, ...input };
  let next = applyLocalEditorBeliefPass(pack);
  const before = scoreHumanBelief(getBlogFullText(next), input, next);

  if (before.score >= DELIVERY_BELIEF_FLOOR) {
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        deliveryBlogBeliefFinish: true,
        humanBeliefScore: before.score,
        humanBelief: before,
      },
    };
  }

  const narrated = applyNarrativeBeliefPass(next, ctx);
  let rescued = applyLocalEditorBeliefPass(narrated);
  const after = scoreHumanBelief(getBlogFullText(rescued), input, rescued);

  if (after.score >= before.score) {
    next = rescued;
  }

  const finalBelief = scoreHumanBelief(getBlogFullText(next), input, next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deliveryBlogBeliefFinish: true,
      deliveryBlogNarrativeRescue: after.score > before.score,
      humanBeliefScore: finalBelief.score,
      humanBelief: finalBelief,
    },
  };
}
