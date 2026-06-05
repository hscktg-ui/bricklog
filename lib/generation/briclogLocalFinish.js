/**
 * GPT 재호출 없이 후처리 — Mission: 글자수 패딩 금지, 초과만 압축
 */
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import {
  getStrictLengthMaxAttempts,
  isBriclogFastPipelineEnabled,
} from "@/lib/config/briclogFastPipeline";
import { isLengthPaddingForbidden } from "@/lib/product/briclogMission";

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} input
 */
export function finishBlogPackLocal(pack, ctx = {}, input = {}) {
  if (!isBriclogFastPipelineEnabled() || !pack?.sections?.length) {
    return pack;
  }

  let next = applyDuplicateKiller(pack, { ...ctx, input }, "blog");
  const tierKey = input.blogLengthTier || ctx.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  const chars = countBlogBodyCharsWithSpaces(next);

  if (isLengthPaddingForbidden()) {
    if (chars > tier.max) {
      const strict = enforceStrictBlogLength(next, ctx, input, {
        maxAttempts: getStrictLengthMaxAttempts(),
      });
      next = strict.pack;
    }
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        briclogLocalFinish: {
          chars: countBlogBodyCharsWithSpaces(next),
          min: tier.min,
          max: tier.max,
          paddingForbidden: true,
          expandPasses: 0,
        },
      },
    };
  }

  const strict = enforceStrictBlogLength(next, ctx, input, {
    maxAttempts: getStrictLengthMaxAttempts(),
  });

  return {
    ...strict.pack,
    _meta: {
      ...(strict.pack?._meta || {}),
      briclogLocalFinish: {
        chars: strict.chars,
        min: tier.min,
        max: tier.max,
        attempts: strict.attempts,
      },
    },
  };
}
