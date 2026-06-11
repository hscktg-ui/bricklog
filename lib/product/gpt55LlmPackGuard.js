/**
 * GPT-5.5 LLM 원고 보존 — Mission·Editor·카탈로그 패딩 금지 SSOT
 */
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";

export function isGpt55LlmPack(pack, hints = {}) {
  if (!pack) return false;
  if (pack._meta?.llmGenerated === true) return true;
  if (pack._meta?.briclogWriterEngine) return true;
  const mode = String(
    pack._meta?.generationMode || hints?.mode || hints?.meta?.generationMode || ""
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

/** GPT-5.5 원고 — Mission 카탈로그·길이 패딩·결말 템플릿 주입 금지 */
export function shouldPreserveGpt55LlmPackBody(pack, hints = {}) {
  if (!isGpt55WriterDominant()) return false;
  if (hints.afterWriterEngine || pack?._meta?.briclogWriterEngine) return true;
  return isGpt55LlmPack(pack, hints) || isWriterEngineExpandedPack(pack);
}

export function shouldSkipMissionCatalogConclusion(pack, input = {}) {
  return shouldPreserveGpt55LlmPackBody(pack, input);
}
