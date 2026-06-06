import { FEEDBACK_INTENT_LABELS } from "@/lib/feedback/feedbackIntentEngine";
import { FEEDBACK_TAGS, FEEDBACK_REACTIONS } from "@/lib/feedback/constants";

const TAG_LABEL = Object.fromEntries(FEEDBACK_TAGS.map((t) => [t.id, t.label]));
const REACTION_LABEL = Object.fromEntries(
  FEEDBACK_REACTIONS.map((r) => [r.id, r.label])
);

function labelTags(tags = []) {
  return (tags || []).map((id) => TAG_LABEL[id] || id);
}

function labelIntents(intents = []) {
  return (intents || []).map((id) => FEEDBACK_INTENT_LABELS[id] || id);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function listAdminFeedback(db, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.offset) || 0, 0);
  const reaction = options.reaction ? String(options.reaction) : null;

  let q = db
    .from("content_feedback")
    .select(
      "id, user_id, brand_id, content_item_id, channel, reaction, tags, memo, intents, rewrite_round, created_at, updated_at, content_items(title)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (reaction) q = q.eq("reaction", reaction);
  if (options.since) q = q.gte("updated_at", options.since);

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = (data || []).map((row) => {
    const item = row.content_items;
    const nested = Array.isArray(item) ? item[0] : item;
    return {
      id: row.id,
      userId: row.user_id,
      brandId: row.brand_id,
      contentItemId: row.content_item_id,
      channel: row.channel,
      reaction: row.reaction,
      reactionLabel: REACTION_LABEL[row.reaction] || row.reaction,
      tags: row.tags || [],
      tagLabels: labelTags(row.tags),
      intents: row.intents || [],
      intentLabels: labelIntents(row.intents),
      memo: row.memo || "",
      rewriteRound: row.rewrite_round ?? 0,
      title: nested?.title || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return { rows, total: count ?? rows.length, limit, offset };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function aggregateAdminFeedbackSummary(db, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data, error } = await db
    .from("content_feedback")
    .select("reaction, tags, intents, rewrite_round, updated_at")
    .gte("updated_at", sinceIso);
  if (error) throw error;

  const reactions = { good: 0, neutral: 0, bad: 0 };
  const tagCounts = {};
  const intentCounts = {};
  let rewriteRounds = 0;
  let withRewrite = 0;

  for (const row of data || []) {
    reactions[row.reaction] = (reactions[row.reaction] || 0) + 1;
    for (const t of row.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    for (const i of row.intents || []) {
      intentCounts[i] = (intentCounts[i] || 0) + 1;
    }
    const round = row.rewrite_round ?? 0;
    if (round > 0) {
      withRewrite += 1;
      rewriteRounds += round;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ id, label: TAG_LABEL[id] || id, count }));

  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({
      id,
      label: FEEDBACK_INTENT_LABELS[id] || id,
      count,
    }));

  return {
    days,
    total: data?.length ?? 0,
    reactions,
    topTags,
    topIntents,
    avgRewriteRound: withRewrite ? Math.round((rewriteRounds / withRewrite) * 10) / 10 : 0,
    withRewrite,
  };
}
