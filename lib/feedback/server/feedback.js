import { sanitizeLogText } from "@/lib/feedback/sanitizeLog";
import { isMissingFeedbackTable } from "@/lib/feedback/db";

const VALID_REACTIONS = new Set(["good", "neutral", "bad"]);

export async function upsertContentFeedback(supabase, userId, body) {
  const reaction = String(body.reaction || "neutral").toLowerCase();
  if (!VALID_REACTIONS.has(reaction)) {
    throw new Error("invalid_reaction");
  }

  const { data: item, error: itemErr } = await supabase
    .from("content_items")
    .select("id, brand_id, channel")
    .eq("id", body.contentItemId)
    .eq("user_id", userId)
    .single();
  if (itemErr) throw itemErr;

  const row = {
    user_id: userId,
    content_item_id: body.contentItemId,
    brand_id: body.brandId || item.brand_id || null,
    channel: body.channel || item.channel || "blog",
    reaction,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 12) : [],
    memo: sanitizeLogText(body.memo || ""),
  };

  const { data, error } = await supabase
    .from("content_feedback")
    .upsert(row, { onConflict: "content_item_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export { isMissingFeedbackTable };
