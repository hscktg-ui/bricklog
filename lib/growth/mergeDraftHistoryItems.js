/**
 * memory content_items + 브랜드 contentArchive 초안 병합 (작업실·검수 하단 목록)
 */
export function mergeDraftHistoryItems(memoryItems = [], archiveItems = []) {
  const seen = new Set();
  const out = [];

  for (const item of memoryItems) {
    const key = `${item.channel}:${String(item.full_content || item.title || "").slice(0, 96)}`;
    seen.add(key);
    out.push(item);
  }

  for (const item of archiveItems) {
    const key = `${item.channel}:${String(item.full_content || item.title || "").slice(0, 96)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
  );
}
