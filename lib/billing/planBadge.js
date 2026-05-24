import { normalizePlanId } from "@/lib/billing/plans";
import { getPlanDisplayTitle } from "@/lib/billing/planUx";

/**
 * 워크스페이스 헤더·사이드바용 플랜 라벨
 * @param {string} planId
 * @param {{ beta?: boolean, compact?: boolean }} [opts]
 */
export function getWorkspacePlanBadge(planId, opts = {}) {
  const id = normalizePlanId(planId);
  if (opts.beta) {
    return {
      planId: "studio",
      label: opts.compact ? "(베타)" : "스튜디오 (베타)",
      variant: "beta",
    };
  }
  return {
    planId: id,
    label: getPlanDisplayTitle(id),
    variant: id === "studio" ? "studio" : id === "brand" ? "brand" : "free",
  };
}
