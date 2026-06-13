/**
 * 후처리가 본문을 깎지 않도록 — inbound 대비 90% 미만이면 rollback
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

const SHRINK_RATIO = 0.9;
const SHRINK_SEVERE_RATIO = 0.4;
const SHRINK_MIN_INBOUND = 120;

/** in-place section mutation 대비 — shrink rollback 스냅샷 */
export function snapshotPackForShrink(pack) {
  if (!pack) return pack;
  return {
    ...pack,
    sections: (pack.sections || []).map((s) => ({ ...s })),
    _meta: pack._meta ? { ...pack._meta } : undefined,
  };
}

function shrinkMeta(inbound, outbound, opts = {}) {
  const inChars = countBlogBodyCharsWithSpaces(inbound);
  const outChars = countBlogBodyCharsWithSpaces(outbound);
  const ratio = inChars > 0 ? outChars / inChars : 1;
  return {
    shrinkGuardRollback: true,
    shrinkGuardStage: opts.stage || "unknown",
    shrinkGuardInboundChars: inChars,
    shrinkGuardOutboundChars: outChars,
    shrinkGuardDropRatio: Math.round((1 - ratio) * 100) / 100,
    shrinkGuardSevereAttempt: ratio < SHRINK_SEVERE_RATIO,
  };
}

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
          ...shrinkMeta(inbound, outbound, opts),
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
      ...shrinkMeta(inbound, outbound, opts),
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
  const inbound = snapshotPackForShrink(pack);
  let outbound;
  try {
    outbound = transform(pack);
  } catch {
    return inbound;
  }
  return guardPackAgainstShrink(inbound, outbound, opts);
}
