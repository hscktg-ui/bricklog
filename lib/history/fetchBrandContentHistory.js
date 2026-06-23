/**
 * 브랜드 글 기록 SSOT — content_items API + contentArchive 병합
 */
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { itemsFromBrandArchive } from "@/lib/growth/brandArchiveHistory";
import { mergeDraftHistoryItems } from "@/lib/growth/mergeDraftHistoryItems";

/**
 * @param {{ brandId: string, contentArchive?: object|null, channelFilter?: string, limit?: number }} opts
 */
export async function fetchBrandContentHistory({
  brandId,
  contentArchive = null,
  channelFilter = "",
  limit = 8,
}) {
  if (!brandId) return [];

  const archiveOpts = { brandId, channelFilter };
  const archiveList = itemsFromBrandArchive(contentArchive, archiveOpts);

  try {
    const q = new URLSearchParams({ brandId });
    if (channelFilter) q.set("channel", channelFilter);
    const data = await fetchWithAuth(`/api/memory/content?${q}`);
    const memoryList = data.items || [];
    return mergeDraftHistoryItems(memoryList, archiveList).slice(0, limit);
  } catch {
    return archiveList.slice(0, limit);
  }
}
