/**
 * 브랜드 글 기록 SSOT — content_items API + contentArchive 병합
 */
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { itemsFromBrandArchive } from "@/lib/growth/brandArchiveHistory";
import { mergeDraftHistoryItems } from "@/lib/growth/mergeDraftHistoryItems";

/**
 * @param {{ brandId: string, contentArchive?: object|null, channelFilter?: string, limit?: number, query?: string }} opts
 */
export async function fetchBrandContentHistory({
  brandId,
  contentArchive = null,
  channelFilter = "",
  limit = 8,
  query = "",
}) {
  if (!brandId) {
    return { items: [], memoryReady: false, usingArchiveFallback: false };
  }

  const archiveOpts = { brandId, channelFilter };
  const archiveList = itemsFromBrandArchive(contentArchive, archiveOpts);

  try {
    const q = new URLSearchParams({ brandId });
    if (channelFilter) q.set("channel", channelFilter);
    if (query) q.set("q", query);
    const data = await fetchWithAuth(`/api/memory/content?${q}`);
    const memoryList = data.items || [];
    const merged = mergeDraftHistoryItems(memoryList, archiveList);
    return {
      items: merged.slice(0, limit),
      memoryReady: data.memoryReady !== false && memoryList.length > 0,
      usingArchiveFallback:
        merged.length > 0 && memoryList.length === 0 && archiveList.length > 0,
    };
  } catch {
    return {
      items: archiveList.slice(0, limit),
      memoryReady: false,
      usingArchiveFallback: archiveList.length > 0,
    };
  }
}
