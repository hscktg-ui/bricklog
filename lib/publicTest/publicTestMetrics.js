/**
 * 실제 검사 결과 기반 — 과장 없이 표시
 */
import { buildBriclogContextScore } from "@/lib/publicTest/briclogContextScore";

export function buildPublicTestMetrics(input = {}, pack = {}, gate = {}) {
  const contextScore = buildBriclogContextScore(input, pack, gate);
  return {
    brandUnderstandingPct: contextScore.brandUnderstandingPct,
    publishScore: contextScore.publishScore,
    improvementHint: contextScore.improvementHint,
    contextScore,
  };
}
