import { fetchWithAuth } from "@/lib/api/clientAuth";
import { channelPackFromPipeline } from "@/lib/memory/contentStore";
import { mergePromptInputWithGeneration } from "@/lib/feedback/generationLog";

/**
 * 파이프라인 결과를 content_items + v1 버전으로 저장
 */
export async function persistPipelineToMemory({
  brandId,
  blog,
  place,
  instagram,
  meta = {},
  versionSource = "generate",
}) {
  const channels = [
    blog && { channel: "blog", content: blog },
    place && { channel: "place", content: place },
    instagram && { channel: "instagram", content: instagram },
  ].filter(Boolean);

  const saved = [];
  for (const { channel, content } of channels) {
    const pack = channelPackFromPipeline(channel, content, meta);
    const promptInput = mergePromptInputWithGeneration(
      pack.promptInput || meta.promptInput || {},
      meta.promptInput || meta.generationInput || {},
      content,
      {
        ...meta,
        qualityScore:
          pack.qualityScore ??
          meta.qualityScore ??
          content?._meta?.qualityScore?.total,
        failReasons: meta.failReasons || meta.failures || content?._meta?.failures,
        rewriteCount: meta.rewriteCount ?? content?._meta?.rewriteCount,
        generationMode: content?._meta?.generationMode,
      }
    );
    try {
      const researchFields = meta.researchStorage || {};
      const res = await fetchWithAuth("/api/memory/content", {
        method: "POST",
        body: JSON.stringify({
          brandId: brandId || null,
          channel,
          title: pack.title,
          fullContent: pack.fullContent,
          hashtags: pack.hashtags,
          persona: pack.persona,
          emotionTone: pack.emotionTone,
          promptInput,
          qualityScore: pack.qualityScore,
          versionSource,
          researchQuery: researchFields.research_query,
          researchResult: researchFields.research_result,
          researchDate: researchFields.research_date,
          researchSource: researchFields.research_source,
        }),
      });
      if (res?.item) saved.push(res.item);
    } catch {
      /* memory tables optional until schema applied */
    }
  }
  return saved;
}

export async function persistMemoryEdit({
  contentItemId,
  title,
  fullContent,
  versionSource = "user_edit",
}) {
  return fetchWithAuth(`/api/memory/content/${contentItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ title, fullContent, versionSource }),
  });
}

export async function persistMemoryRewrite({
  contentItemId,
  channel,
  content,
  meta = {},
}) {
  const pack = channelPackFromPipeline(channel, content, meta);
  return persistMemoryEdit({
    contentItemId,
    title: pack.title,
    fullContent: pack.fullContent,
    versionSource: "ai_rewrite",
  });
}
