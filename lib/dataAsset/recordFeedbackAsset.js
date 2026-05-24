import { ASSET_TYPES, appendAssetRegistryEvent, persistBrandAssetRollup } from "@/lib/dataAsset/rollupBrandAssets";
import { isMissingDataAssetTable } from "@/lib/dataAsset/isMissingDataAssetTable";

/**
 * 피드백 제출 후 데이터 자산 기록 + 롤업
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function recordFeedbackAsset(
  supabase,
  userId,
  {
    brandId = null,
    contentItemId = null,
    channel = "blog",
    reaction = "neutral",
    tags = [],
  } = {}
) {
  if (!userId) return { ok: false };

  try {
    await appendAssetRegistryEvent(supabase, userId, {
      brandId,
      contentItemId,
      assetType: ASSET_TYPES.FEEDBACK,
      channel,
      summary: {
        reaction,
        tagCount: Array.isArray(tags) ? tags.length : 0,
        tags: (tags || []).slice(0, 8).map((t) => String(t).slice(0, 32)),
      },
    });

    if (brandId) {
      await persistBrandAssetRollup(supabase, userId, brandId);
    }

    return { ok: true };
  } catch (err) {
    if (isMissingDataAssetTable(err)) return { ok: false, skipped: true };
    throw err;
  }
}
