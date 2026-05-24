import { buildResearchBrief, serializeResearchForStorage } from "@/lib/research/buildResearchBrief";
import { normalizeResearchTypes } from "@/lib/research/types";

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
  const brief = buildResearchBrief(researchRes.research, {
    query: trimmed,
    types: researchTypes,
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
