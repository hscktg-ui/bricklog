/**
 * 세션 조사 결과 — blogInput·다시받기·피드백 재생성 SSOT
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";

/** @param {object|null} researchResult */
export function extractFactsFromResearchResult(researchResult = null) {
  if (!researchResult) return [];
  return (
    researchResult?.v2Axis?.researchFacts ||
    researchResult?.facts ||
    researchResult?.parsed?.facts ||
    researchResult?.researchFacts ||
    []
  );
}

/**
 * blogInput + researchResult → pipelineInput에 조사 축 복원
 * @param {object} input
 * @param {object|null} researchResult
 */
export function mergeResearchSessionIntoInput(input = {}, researchResult = null) {
  const fromResult = extractFactsFromResearchResult(researchResult);
  const merged = collectMergedResearchFacts(
    input,
    { facts: fromResult },
    researchResult || input.research || input.v2AxisResearch || {}
  );

  const next = { ...input };
  if (merged.length) next.researchFacts = merged;
  if (researchResult?.brief && !next.researchBrief) {
    next.researchBrief = researchResult.brief;
  }
  if (researchResult?.v2AxisBrief && !next.v2AxisBrief) {
    next.v2AxisBrief = researchResult.v2AxisBrief;
  }
  if (researchResult?.geminiWriterBrief && !next.geminiWriterBrief) {
    next.geminiWriterBrief = researchResult.geminiWriterBrief;
  }
  next.v2ResearchReady = true;
  next.v2PreWriteVerified = true;
  next.v2AxisVerified = true;
  next.v2PipelineStage = next.v2PipelineStage || "information_research_verified";
  return next;
}

/** 다시받기 시 조사 재실행 생략 가능 여부 */
export function canReuseClientResearch(input = {}, researchResult = null) {
  const merged = mergeResearchSessionIntoInput(input, researchResult);
  return (
    hasUsableResearchFacts(merged) &&
    (merged.v2ResearchReady || merged.v2PreWriteVerified || merged.v2AxisVerified)
  );
}
