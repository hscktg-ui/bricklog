/**
 * 로컬·rescue fallback 분량 하한 — LLM full tier와 분리
 * @param {"short"|"medium"|"long"} [tierKey]
 * @param {{ min?: number }} [tier]
 */
export function resolveDraftFallbackMinChars(tierKey = "short", tier = {}) {
  const key = tierKey || tier.key || "short";
  const min = Number(tier.min) || 3600;
  if (key === "long") return Math.max(800, Math.round(min * 0.16));
  if (key === "medium") return Math.max(400, Math.round(min * 0.18));
  return Math.max(1500, Math.round(min * 0.42));
}
