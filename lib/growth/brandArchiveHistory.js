/**
 * Supabase memory 테이블 없을 때 브랜드 contentArchive → 작업실 목록
 */
const CHANNEL_MAP = {
  blog: "blog",
  place: "place",
  insta: "instagram",
};

const SOURCE_LABEL = {
  generate: "생성",
  paste_review_input: "검수 원문",
  paste_review_improve: "검수 개선",
  paste_review_refine: "검수 보완",
  user_edit: "수정",
};

export function itemsFromBrandArchive(archive = {}, { brandId, channelFilter } = {}) {
  const items = [];
  for (const [key, list] of Object.entries(archive || {})) {
    const channel = CHANNEL_MAP[key] || key;
    if (channelFilter && channel !== channelFilter) continue;
    for (const entry of list || []) {
      const text = String(entry?.text || entry?.preview || "").trim();
      if (!text) continue;
      const at = entry?.at || new Date().toISOString();
      const src = entry?.versionSource || entry?.source || "";
      const srcLabel = SOURCE_LABEL[src] || (src ? src : "");
      const firstLine = text.split("\n")[0]?.slice(0, 72) || "초안";
      items.push({
        id: `archive-${channel}-${at}`,
        brand_id: brandId,
        channel,
        title: srcLabel ? `[${srcLabel}] ${firstLine}` : firstLine,
        full_content: text,
        created_at: at,
        prompt_input: src ? { versionSource: src, source: "brand_archive" } : {},
        _fromBrandArchive: true,
      });
    }
  }
  return items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
