import { sanitizeLogMeta } from "@/lib/feedback/sanitizeLog";
import { CONTENT_EVENT_TYPES } from "@/lib/feedback/constants";
import { isMissingFeedbackTable } from "@/lib/feedback/db";

export async function insertContentEvent(supabase, userId, payload) {
  const eventType = String(payload.eventType || "").trim();
  if (!CONTENT_EVENT_TYPES.includes(eventType)) {
    throw new Error("invalid_event_type");
  }

  const row = {
    user_id: userId,
    brand_id: payload.brandId || null,
    content_item_id: payload.contentItemId || null,
    event_type: eventType,
    channel: payload.channel || "",
    meta: sanitizeLogMeta(payload.meta || {}),
  };

  const { data, error } = await supabase
    .from("content_events")
    .insert(row)
    .select("id, event_type, created_at")
    .single();

  if (error) throw error;
  return data;
}

export { isMissingFeedbackTable };
