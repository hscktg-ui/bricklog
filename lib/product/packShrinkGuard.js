/**
 * 후처리가 본문을 깎지 않도록 — inbound 대비 90% 미만이면 rollback
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

const SHRINK_RATIO = 0.9;
const SHRINK_MIN_INBOUND = 120;

/**
 * @param {object|null} inbound
 * @param {object|null} outbound
 * @param {{ channel?: string }} [opts]
 * @returns {object|null}
 */
export function guardPackAgainstShrink(inbound, outbound, opts = {}) {
  if (!outbound?.sections?.length) {
    if (inbound?.sections?.length) {
      return {
        ...inbound,
        _meta: {
          ...(inbound._meta || {}),
          shrinkGuardRollback: true,
          shrinkGuardStage: opts.stage || "unknown",
        },
      };
    }
    return outbound;
  }
  if (!inbound?.sections?.length) return outbound;

  const inChars = countBlogBodyCharsWithSpaces(inbound);
  const outChars = countBlogBodyCharsWithSpaces(outbound);
  if (inChars < SHRINK_MIN_INBOUND) return outbound;
  if (outChars >= inChars * SHRINK_RATIO) return outbound;

  return {
    ...inbound,
    _meta: {
      ...(inbound._meta || {}),
      shrinkGuardRollback: true,
      shrinkGuardStage: opts.stage || "unknown",
      shrinkGuardInboundChars: inChars,
      shrinkGuardOutboundChars: outChars,
    },
  };
}

/**
 * @param {object} pack
 * @param {function(object): object} transform
 * @param {{ stage?: string }} [opts]
 */
export function withShrinkGuard(pack, transform, opts = {}) {
  if (!pack?.sections?.length) return transform(pack);
  const inbound = pack;
  let outbound;
  try {
    outbound = transform(pack);
  } catch {
    return inbound;
  }
  return guardPackAgainstShrink(inbound, outbound, opts);
}
