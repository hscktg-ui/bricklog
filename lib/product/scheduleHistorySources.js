/**
 * 스케줄 캘린더 — memory · archive · generations 통합
 */
import { parseStoredContent } from "@/lib/contentFormat";
import { mergeDraftHistoryItems } from "@/lib/growth/mergeDraftHistoryItems";
import { itemsFromBrandArchive } from "@/lib/growth/brandArchiveHistory";

function channelTitle(channel, parsed, fallback) {
  if (channel === "blog") {
    const blog = parsed;
    if (blog && typeof blog === "object") {
      return (
        String(blog.title || blog.titles?.[0] || "").trim() ||
        String(fallback || "이야기")
      );
    }
    if (typeof blog === "string" && blog.trim()) {
      return blog.split("\n")[0].slice(0, 72);
    }
  }
  if (channel === "place") {
    const place = parsed;
    if (place && typeof place === "object") {
      return String(place.title || place.shortBody || fallback || "플레이스").trim();
    }
    if (typeof place === "string" && place.trim()) {
      return place.split("\n")[0].slice(0, 72);
    }
  }
  if (channel === "instagram") {
    const insta = parsed;
    if (insta && typeof insta === "object") {
      const hook = String(insta.hook || "").trim();
      const body = String(insta.body || insta.lineBreakBody || "").trim();
      return (hook || body.split("\n")[0] || fallback || "인스타").slice(0, 72);
    }
    if (typeof insta === "string" && insta.trim()) {
      return insta.split("\n")[0].slice(0, 72);
    }
  }
  return String(fallback || "초안").slice(0, 72);
}

function generationHasChannelContent(raw) {
  if (!raw) return false;
  if (typeof raw === "string") return raw.trim().length > 8;
  try {
    const parsed = parseStoredContent(raw, null);
    if (!parsed) return false;
    if (typeof parsed === "string") return parsed.trim().length > 8;
    return true;
  } catch {
    return String(raw).trim().length > 8;
  }
}

/**
 * @param {unknown[]} generations
 * @param {string | null | undefined} brandId
 */
export function generationsToScheduleItems(generations = [], brandId = null) {
  const items = [];
  for (const gen of generations) {
    const row = /** @type {Record<string, unknown>} */ (gen);
    const rowBrandId = row.brand_id ? String(row.brand_id) : "";
    if (brandId && rowBrandId && rowBrandId !== brandId) continue;

    const created_at = String(row.created_at || "");
    const fallback = String(row.main_keyword || row.region || "초안").trim();

    const channels = [
      ["blog", row.blog],
      ["place", row.place],
      ["instagram", row.instagram],
    ];

    for (const [channel, raw] of channels) {
      if (!generationHasChannelContent(raw)) continue;
      let parsed = null;
      try {
        parsed = parseStoredContent(raw, null);
      } catch {
        parsed = raw;
      }
      items.push({
        id: `gen-${row.id}-${channel}`,
        brand_id: rowBrandId || brandId || null,
        channel,
        title: `[생성] ${channelTitle(channel, parsed, fallback)}`,
        full_content: typeof raw === "string" ? raw : "",
        created_at,
        prompt_input: { source: "generations" },
      });
    }
  }
  return items;
}

/**
 * @param {unknown[]} rows — Supabase generations rows 또는 schedule items
 * @param {string | null | undefined} brandId
 */
function resolveGenerationScheduleItems(rows = [], brandId = null) {
  if (!rows.length) return [];
  const first = /** @type {Record<string, unknown>} */ (rows[0]);
  if (first.blog !== undefined || first.place !== undefined || first.instagram !== undefined) {
    return generationsToScheduleItems(rows, brandId);
  }
  return rows;
}

/**
 * @param {{
 *   memoryItems?: unknown[];
 *   generationItems?: unknown[];
 *   contentArchive?: object | null;
 *   brandId?: string | null;
 * }} input
 */
export function mergeScheduleHistorySources(input = {}) {
  const archiveItems = itemsFromBrandArchive(input.contentArchive || {}, {
    brandId: input.brandId,
  });
  const generationItems = resolveGenerationScheduleItems(
    input.generationItems || [],
    input.brandId
  );
  return mergeDraftHistoryItems(
    mergeDraftHistoryItems(input.memoryItems || [], archiveItems),
    generationItems
  );
}
