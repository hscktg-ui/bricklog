/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ brandId?: string | null, channel?: string }} opts
 */
export async function resolveLatestContentItemId(supabase, userId, opts = {}) {
  const channel = String(opts.channel || "blog").toLowerCase();
  let query = supabase
    .from("content_items")
    .select("id")
    .eq("user_id", userId)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1);

  if (opts.brandId) {
    query = query.eq("brand_id", opts.brandId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.id || null;
}
