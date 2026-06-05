import { fetchWithAuth } from "@/lib/api/clientAuth";
import { pipelineContentFromMemoryItem } from "@/lib/memory/contentStore";

/**
 * 브랜드별 최신 채널 콘텐츠를 content_items에서 복원
 * @param {string} brandId
 */
export async function hydrateWorkspaceFromMemory(brandId) {
  if (!brandId) {
    return {
      contents: {},
      memoryContentIds: { blog: null, place: null, instagram: null },
      memoryReady: true,
    };
  }

  const data = await fetchWithAuth(
    `/api/memory/content?brandId=${encodeURIComponent(brandId)}`
  );
  const items = data.items || [];
  const memoryReady = data.memoryReady !== false;
  const memoryContentIds = { blog: null, place: null, instagram: null };
  const contents = {};

  for (const channel of ["blog", "place", "instagram"]) {
    const item = items.find((row) => row.channel === channel);
    if (!item?.id) continue;
    memoryContentIds[channel] = item.id;
    let full = item;
    if (!item.prompt_input && !item.promptInput) {
      try {
        const detail = await fetchWithAuth(
          `/api/memory/content/${encodeURIComponent(item.id)}`
        );
        if (detail?.item) full = detail.item;
      } catch {
        /* list row only */
      }
    }
    const parsed = pipelineContentFromMemoryItem(channel, full);
    if (parsed) contents[channel] = parsed;
  }

  return { contents, memoryContentIds, memoryReady };
}
