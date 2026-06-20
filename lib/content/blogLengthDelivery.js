/**
 * 고객 분량 tier — 출고·재작성 게이트 (공백 포함 글자 수)
 */
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { scoreLengthTierCompliance } from "@/lib/content/humanDeliveryRules";

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 * @param {{ strict?: boolean }} [opts] strict=true → min 이상만 통과
 */
export function isBlogLengthTierMet(pack, input = {}, opts = {}) {
  const strict = opts.strict !== false;
  const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const check = scoreLengthTierCompliance(pack, {
    input,
    blogLengthTier: tierKey,
  });
  if (strict) return check.chars >= check.min && check.chars <= check.max;
  return check.ok;
}

/**
 * @param {Record<string, unknown>} input
 * @param {object} pack
 */
export function assertBlogLengthTier(input = {}, pack) {
  const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const check = scoreLengthTierCompliance(pack, { input, blogLengthTier: tierKey });
  if (check.ok) {
    return {
      ok: true,
      chars: check.chars,
      tier: tierKey,
      min: check.min,
      max: check.max,
      tierCatalogMin: check.tierCatalogMin,
    };
  }
  return {
    ok: false,
    chars: check.chars,
    tier: tierKey,
    min: check.min,
    max: check.max,
    tierCatalogMin: check.tierCatalogMin,
    researchGroundedLength: check.researchGroundedLength,
    reasons: check.reasons.length ? check.reasons : [check.chars < check.min ? "length_tier_under" : "length_tier_over"],
  };
}
