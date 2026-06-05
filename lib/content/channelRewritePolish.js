/**
 * 채널 피드백·재작성 후 Story Target · Humanity 스택 재적용
 */
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";

/**
 * @param {"place"|"instagram"} channel
 * @param {object} pack
 * @param {object} input
 * @param {object} [ctx]
 */
export function polishChannelPackAfterPipeline(channel, pack, input = {}, ctx = {}) {
  if (!pack || (channel !== "place" && channel !== "instagram")) return pack;
  const normalizedInput = input || ctx.input || {};
  const fullCtx = { ...ctx, input: normalizedInput };
  let next = applyChannelStoryGate(pack, channel, fullCtx);
  next = applyHumanityFinishPass(next, fullCtx, channel);
  return next;
}
