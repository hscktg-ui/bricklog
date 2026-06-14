/**
 * 실제 검사 결과 기반 — 과장 없이 표시
 */
import { buildBriclogContextScore } from "@/lib/publicTest/briclogContextScore";

export function buildPublicTestMetrics(input = {}, pack = {}, gate = {}) {
  const channelOpts = {
    hasPlace: Boolean(pack.place?.detailBody || pack.place?.shortNotice),
    hasInsta: Boolean(pack.instagram?.lineBreakBody || pack.instagram?.body),
    placeHint: pack.place ? "샘플에 포함" : undefined,
    instaHint: pack.instagram ? "샘플에 포함" : undefined,
  };
  const contextScore = buildBriclogContextScore(input, pack, {
    ...gate,
    channelOpts,
  });
  return {
    brandUnderstandingPct: contextScore.brandUnderstandingPct,
    publishScore: contextScore.publishScore,
    improvementHint: contextScore.improvementHint,
    contextScore,
  };
}
