/**
 * content_items.prompt_input에 병합할 생성 메타
 */
export function buildGenerationLogMeta(input = {}, content = {}, meta = {}) {
  const qs = meta.qualityScore ?? content?._meta?.qualityScore;
  const total =
    typeof qs === "number" ? qs : qs?.total ?? content?._meta?.qualityScore?.total ?? null;

  return {
    generation_log: {
      input_topic:
        input.topic || input.mainKeyword || meta.inputTopic || "",
      persona: meta.persona || input.persona || input.v4Speaker || "",
      emotion_tone:
        meta.emotionTone || input.emotionTone || input.emotionTemperature || "",
      writing_tone: meta.writingTone || input.tone || input.writingTone || "",
      skill_level: meta.skillLevel || input.skillLevel || "",
      title:
        content?.representativeTitle ||
        content?.title ||
        meta.title ||
        "",
      quality_score: total,
      fail_reasons: meta.failReasons || meta.failures || content?._meta?.failures || [],
      rewrite_count: meta.rewriteCount ?? content?._meta?.rewriteCount ?? 0,
      generation_mode: content?._meta?.generationMode || meta.generationMode || "",
      logged_at: new Date().toISOString(),
    },
  };
}

export function mergePromptInputWithGeneration(existing = {}, input, content, meta) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? existing
      : {};
  const log = buildGenerationLogMeta(input, content, meta);
  return { ...base, ...log };
}
