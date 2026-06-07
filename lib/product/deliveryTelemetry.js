/**
 * 배달 경로 계측 — generationMode / fallback / failReasons SSOT
 */

function mergePackMeta(pack = {}, meta = {}) {
  const fromMeta = pack._meta || {};
  const fromRoot =
    pack.draftFallback != null ||
    pack.softPass != null ||
    pack.passOutput != null ||
    pack.generationMode != null
      ? pack
      : {};
  return { ...fromRoot, ...fromMeta, ...meta };
}

export function resolveDeliveryPath(pack = {}, meta = {}) {
  const m = mergePackMeta(pack, meta);
  if (m.draftFallback || m.missionProseFallback) return "template_fallback";
  if (m.generationMode === "llm_soft_pass" || m.softPass) return "llm_soft_pass";
  if (m.passOutput && (m.generationMode || "").startsWith("llm")) {
    return "llm_hard_pass";
  }
  if ((m.generationMode || "").includes("fallback")) return "template_fallback";
  if (m.generationMode === "length_recovered") return "length_recovered";
  return m.generationMode || "unknown";
}

export function buildQualitySignals(pack = {}, meta = {}) {
  const m = mergePackMeta(pack, meta);
  return {
    deliveryPath: resolveDeliveryPath(pack, meta),
    softPass: Boolean(m.softPass || meta.softPass),
    draftFallback: Boolean(m.draftFallback || meta.draftFallback),
    missionProseFallback: Boolean(m.missionProseFallback),
    passOutput: Boolean(m.passOutput || meta.passOutput),
    qualityScore:
      m.qualityScore?.total ??
      m.coreQuality?.total ??
      meta.qualityScore ??
      null,
    rewriteCount: m.rewriteCount ?? meta.rewriteCount ?? meta.regenAttempts ?? null,
    failReasons: [
      ...new Set([...(m.failReasons || []), ...(meta.failReasons || [])]),
    ].slice(0, 10),
  };
}

export function attachDeliveryTelemetry(meta = {}, pack = null) {
  const signals = buildQualitySignals(pack || {}, meta);
  return {
    ...meta,
    deliveryPath: signals.deliveryPath,
    qualitySignals: signals,
  };
}
