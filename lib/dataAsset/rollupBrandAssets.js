import { ASSET_TYPES, ROLLUP_VERSION } from "@/lib/dataAsset/constants";
import { isMissingDataAssetTable } from "@/lib/dataAsset/isMissingDataAssetTable";
import { sanitizeLogMeta } from "@/lib/feedback/sanitizeLog";

const SINCE_DAYS = 90;

/**
 * 브랜드별 자산 롤업 계산 (원문·PII 없음)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function computeBrandAssetRollup(supabase, userId, brandId) {
  if (!brandId || !userId) return null;

  const since = new Date();
  since.setDate(since.getDate() - SINCE_DAYS);

  const [itemsRes, feedbackRes, eventsRes, learningRes, perfRes] =
    await Promise.all([
      supabase
        .from("content_items")
        .select("id, channel, quality_score, created_at")
        .eq("user_id", userId)
        .eq("brand_id", brandId)
        .gte("created_at", since.toISOString())
        .limit(500),
      supabase
        .from("content_feedback")
        .select("reaction, channel, created_at")
        .eq("user_id", userId)
        .eq("brand_id", brandId)
        .gte("created_at", since.toISOString())
        .limit(200),
      supabase
        .from("content_events")
        .select("event_type, channel, created_at")
        .eq("user_id", userId)
        .eq("brand_id", brandId)
        .gte("created_at", since.toISOString())
        .limit(300),
      supabase
        .from("brand_learning_profiles")
        .select("updated_at, profile")
        .eq("user_id", userId)
        .eq("brand_id", brandId)
        .maybeSingle(),
      supabase
        .from("content_performance")
        .select(
          "id, content_items!inner(brand_id), created_at"
        )
        .eq("user_id", userId)
        .eq("content_items.brand_id", brandId)
        .gte("created_at", since.toISOString())
        .limit(100),
    ]);

  if (
    itemsRes.error &&
    feedbackRes.error &&
    isMissingDataAssetTable(itemsRes.error)
  ) {
    return null;
  }

  const items = itemsRes.error ? [] : itemsRes.data || [];
  const feedback = feedbackRes.error ? [] : feedbackRes.data || [];
  const events = eventsRes.error ? [] : eventsRes.data || [];
  const learning = learningRes.error ? null : learningRes.data;
  const perfCount = perfRes.error ? 0 : (perfRes.data || []).length;

  const channels = {};
  let qualitySum = 0;
  let qualityN = 0;
  let lastGenerationAt = null;

  for (const it of items) {
    const ch = it.channel || "other";
    channels[ch] = (channels[ch] || 0) + 1;
    if (typeof it.quality_score === "number") {
      qualitySum += it.quality_score;
      qualityN += 1;
    }
    if (!lastGenerationAt || it.created_at > lastGenerationAt) {
      lastGenerationAt = it.created_at;
    }
  }

  const reactions = { good: 0, neutral: 0, bad: 0 };
  let lastFeedbackAt = null;
  for (const f of feedback) {
    reactions[f.reaction] = (reactions[f.reaction] || 0) + 1;
    if (!lastFeedbackAt || f.created_at > lastFeedbackAt) {
      lastFeedbackAt = f.created_at;
    }
  }

  const eventCounts = {};
  for (const e of events) {
    const t = e.event_type || "unknown";
    eventCounts[t] = (eventCounts[t] || 0) + 1;
  }

  const profile = learning?.profile || {};

  return {
    assetVersion: ROLLUP_VERSION,
    generationCount: items.length,
    feedbackCount: feedback.length,
    performanceCount: perfCount,
    eventCount: events.length,
    channels,
    feedbackRatios: reactions,
    eventCounts,
    avgQualityScore: qualityN ? Math.round(qualitySum / qualityN) : null,
    lastGenerationAt,
    lastFeedbackAt,
    learningUpdatedAt: learning?.updated_at || null,
    hasStyleFingerprint: !!profile.styleFingerprint,
    recentSummaryCount: (profile.recentContentSummaries || []).length,
    recomputedAt: new Date().toISOString(),
  };
}

/**
 * brands.brand_data_assets 컬럼 갱신
 */
export async function persistBrandAssetRollup(supabase, userId, brandId) {
  const rollup = await computeBrandAssetRollup(supabase, userId, brandId);
  if (!rollup) return null;

  const { data, error } = await supabase
    .from("brands")
    .update({ brand_data_assets: rollup })
    .eq("id", brandId)
    .eq("user_id", userId)
    .select("brand_data_assets")
    .single();

  if (error) {
    if (isMissingDataAssetTable(error)) return null;
    throw error;
  }
  return data?.brand_data_assets || rollup;
}

/**
 * 레지스트리에 자산 이벤트 1건 기록 (summary는 sanitize됨)
 */
export async function appendAssetRegistryEvent(
  supabase,
  userId,
  {
    brandId = null,
    contentItemId = null,
    assetType,
    channel = "",
    summary = {},
  }
) {
  const row = {
    user_id: userId,
    brand_id: brandId,
    content_item_id: contentItemId,
    asset_type: assetType,
    channel: channel || "",
    summary: sanitizeLogMeta(summary),
  };

  const { error } = await supabase.from("data_asset_registry").insert(row);
  if (error) {
    if (isMissingDataAssetTable(error)) return false;
    throw error;
  }
  return true;
}

export { ASSET_TYPES };
