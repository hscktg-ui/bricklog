/** LLM으로 생성·파생 가능한 블로그 팩 여부 */
export function isLlmBlogPack(meta) {
  if (!meta || meta.isBriefOnly) return false;
  const mode = String(meta.generationMode || "");
  return mode === "llm" || mode.startsWith("llm_");
}
