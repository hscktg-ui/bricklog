/**
 * CONFIDENCE ENGINE — 신뢰도 50% 미만 정보는 본문 사용 금지
 */
import { classifyFactVerification } from "@/lib/product/brandJournalistDirective";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

export const CONFIDENCE_ENGINE_VERSION = "v1";
export const MIN_CONFIDENCE_FOR_BODY = 0.5;

/**
 * @returns {{ confidence: number, usable: boolean, reason?: string }}
 */
export function scoreFactConfidence(row = {}, input = {}) {
  const verification = classifyFactVerification(row, input);
  if (!verification.verified) {
    return { confidence: verification.confidence ?? 0, usable: false, reason: verification.reason };
  }
  const confidence = verification.confidence ?? 0.6;
  return {
    confidence,
    usable: confidence >= MIN_CONFIDENCE_FOR_BODY,
    reason: confidence < MIN_CONFIDENCE_FOR_BODY ? "below_body_threshold" : undefined,
  };
}

export function filterUsableFactsForBody(input = {}, parsed = {}, research = {}) {
  const facts = collectMergedResearchFacts(input, parsed, research);
  const scored = facts.map((row) => ({
    ...row,
    confidence: scoreFactConfidence(row, input),
  }));
  const usable = scored.filter((r) => r.confidence.usable);
  const uncertain = scored.filter(
    (r) => classifyFactVerification(r, input).verified && !r.confidence.usable
  );
  const rejected = scored.filter((r) => !r.confidence.usable);

  const avgConfidence = usable.length
    ? usable.reduce((s, r) => s + r.confidence.confidence, 0) / usable.length
    : 0;

  return {
    version: CONFIDENCE_ENGINE_VERSION,
    usable,
    uncertain,
    rejected,
    usableCount: usable.length,
    avgConfidence,
    ok: usable.length > 0,
    minRequired: MIN_CONFIDENCE_FOR_BODY,
  };
}

export function formatConfidenceBrief(filter = {}) {
  return [
    "【신뢰도 · CONFIDENCE】",
    `본문 사용 가능 사실: ${filter.usableCount || 0}건 (≥${Math.round(MIN_CONFIDENCE_FOR_BODY * 100)}%)`,
    filter.uncertain?.length
      ? `불확실: ${filter.uncertain.length}건 — 본문 제외`
      : "불확실 정보: 없음",
  ].join("\n");
}
