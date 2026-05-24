import { collectPublicSignals } from "@/lib/research/searchSources/mockCollector";
import { buildResearchBrief, serializeResearchForStorage } from "@/lib/research/buildResearchBrief";
import { normalizeResearchTypes } from "@/lib/research/types";

function buildPublicSignalsBrief(input) {
  const collected = collectPublicSignals(input);
  if (!collected?.trendTopics?.length && !collected?.reviewThemes?.length) {
    return "";
  }
  const active = (collected.sources || [])
    .filter((s) => s.status === "mock_inferred")
    .map((s) => s.type)
    .join(", ");
  const lines = [
    active ? `수집 채널 신호(구조): ${active}` : null,
    collected.trendTopics?.length
      ? `트렌드 주제: ${collected.trendTopics.join(" · ")}`
      : null,
    collected.reviewThemes?.length
      ? `후기·방문 관심: ${collected.reviewThemes.join(" · ")}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Run research API and attach brief to pipelineInput.
 * @returns {Promise<object|null>} researchStorage for persistence, or null
 */
export async function applyResearchToPipeline({
  pipelineInput,
  query,
  types,
  generateResearchAsync,
  setResearchResult,
}) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return null;

  const researchTypes = normalizeResearchTypes(types);
  const researchRes = await generateResearchAsync({
    ...pipelineInput,
    researchQuery: trimmed,
    researchTypes,
  });

  if (!researchRes?.research) return null;

  setResearchResult?.(researchRes.research);
  const publicSignalsBrief = buildPublicSignalsBrief(pipelineInput);
  const brief = buildResearchBrief(researchRes.research, {
    query: trimmed,
    types: researchTypes,
    publicSignalsBrief,
  });
  pipelineInput.researchBrief = brief;
  const storage = serializeResearchForStorage(
    trimmed,
    researchRes.research,
    researchTypes
  );
  pipelineInput.researchPayload = storage;
  return storage;
}
