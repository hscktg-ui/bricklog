import { ASSET_TYPES, appendAssetRegistryEvent, persistBrandAssetRollup } from "@/lib/dataAsset/rollupBrandAssets";
import { isMissingDataAssetTable } from "@/lib/dataAsset/isMissingDataAssetTable";

/**
 * 생성·저장 후 데이터 자산 기록 + 롤업
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function recordGenerationAsset(
  supabase,
  userId,
  {
    brandId = null,
    contentItemId = null,
    channel = "blog",
    qualityScore = null,
    persona = "",
    emotionTone = "",
    meta = {},
  } = {}
) {
  if (!userId) return { ok: false };

  try {
    await appendAssetRegistryEvent(supabase, userId, {
      brandId,
      contentItemId,
      assetType: ASSET_TYPES.GENERATION,
      channel,
      summary: {
        qualityScore,
        persona: String(persona || "").slice(0, 40),
        emotionTone: String(emotionTone || "").slice(0, 40),
        source: meta.versionSource || meta.source || "generate",
        hasRewrite: !!meta.rewriteCount,
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
