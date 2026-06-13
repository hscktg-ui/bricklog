/** LLM 원고 판별 — contentQualityDelivery 순환 import 방지 */
export function isLlmOriginatedPack(pack, hints = {}) {
  if (pack?._meta?.llmGenerated === true) return true;
  const mode = String(
    pack?._meta?.generationMode ||
      hints?.meta?.generationMode ||
      hints?.mode ||
      ""
  );
  return (
    mode === "llm" ||
    mode.startsWith("llm_") ||
    mode === "llm_gate_preserved" ||
    mode === "llm_mission_delivery" ||
    mode === "llm_human_column"
  );
}

export function isWriterEngineExpandedPack(pack) {
  return Boolean(
    pack?._meta?.briclogWriterEngine ||
      pack?._meta?.llmHumanTierExpansion ||
      pack?._meta?.llmHumanColumnRewrite ||
      pack?._meta?.writerEngineExpanded ||
      pack?._meta?.writerEngineRewritten ||
      pack?._meta?.writerEngineVoicePolished
  );
}
