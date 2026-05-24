import { channelPackFromPipeline } from "@/lib/memory/contentStore";

export { channelPackFromPipeline };

export function isMissingMemoryTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /content_items|user_templates|brand_assets/i.test(msg)
  );
}

export function isMissingMemoryColumn(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    /column.*does not exist/i.test(msg)
  );
}

export async function upsertContentItem(supabase, userId, payload) {
  const row = {
    user_id: userId,
    brand_id: payload.brandId || null,
    channel: payload.channel || "blog",
    title: payload.title || "",
    full_content: payload.fullContent || "",
    hashtags: payload.hashtags || "",
    persona: payload.persona || "",
    emotion_tone: payload.emotionTone || "",
    prompt_input: payload.promptInput || {},
    quality_score: payload.qualityScore ?? null,
    generation_id: payload.generationId || null,
  };

  if (payload.researchQuery != null) row.research_query = payload.researchQuery;
  if (payload.researchResult != null) {
    row.research_result =
      typeof payload.researchResult === "object"
        ? payload.researchResult
        : {};
  }
  if (payload.researchDate != null) row.research_date = payload.researchDate;
  if (payload.researchSource != null) {
    row.research_source = Array.isArray(payload.researchSource)
      ? payload.researchSource
      : [];
  }

  let itemId = payload.contentItemId;
  if (itemId) {
    const { data, error } = await supabase
      .from("content_items")
      .update(row)
      .eq("id", itemId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  itemId = data.id;

  await addContentVersion(supabase, userId, {
    contentItemId: itemId,
    source: payload.versionSource || "generate",
    title: row.title,
    fullContent: row.full_content,
  });

  return data;
}

export async function addContentVersion(supabase, userId, payload) {
  const { data: last } = await supabase
    .from("content_versions")
    .select("version_number")
    .eq("content_item_id", payload.contentItemId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextNum = (last?.[0]?.version_number || 0) + 1;

  const { data, error } = await supabase
    .from("content_versions")
    .insert({
      content_item_id: payload.contentItemId,
      user_id: userId,
      version_number: nextNum,
      source: payload.source || "user_edit",
      title: payload.title || "",
      full_content: payload.fullContent || "",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listContentItems(supabase, userId, filters = {}) {
  let q = supabase
    .from("content_items")
    .select(
      "id, brand_id, channel, title, full_content, hashtags, persona, emotion_tone, quality_score, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(filters.limit || 80);

  if (filters.brandId) q = q.eq("brand_id", filters.brandId);
  if (filters.channel) q = q.eq("channel", filters.channel);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function countContentItems(supabase, userId) {
  const { count, error } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

