import { persistBrandAssetRollup, appendAssetRegistryEvent, ASSET_TYPES } from "@/lib/dataAsset/rollupBrandAssets";
import { isMissingDataAssetTable } from "@/lib/dataAsset/isMissingDataAssetTable";
import { recomputeBrandLearningProfile } from "@/lib/feedback/brandLearningProfile";
import { recomputeUserWritingProfile } from "@/lib/memory/userWritingProfile";

const MAX_BRANDS = 120;

/**
 * 야간 크론: 브랜드·계정 자산 복리화 (학습 프로필 + 롤업)
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function compoundDataAssetsNightly(db, brandPairs = []) {
  const pairs = brandPairs.slice(0, MAX_BRANDS);
  let rollupsUpdated = 0;
  let learningRecomputed = 0;
  let skipped = 0;
  const userIds = new Set();

  for (const [brandId, userId] of pairs) {
    if (!brandId || !userId) continue;
    userIds.add(userId);
    try {
      const profile = await recomputeBrandLearningProfile(db, userId, brandId);
      if (profile) learningRecomputed += 1;

      const rollup = await persistBrandAssetRollup(db, userId, brandId);
      if (rollup) {
        rollupsUpdated += 1;
        await appendAssetRegistryEvent(db, userId, {
          brandId,
          assetType: ASSET_TYPES.COMPOUND,
          channel: "",
          summary: {
            generationCount: rollup.generationCount,
            feedbackCount: rollup.feedbackCount,
            nightly: true,
          },
        }).catch(() => null);
      } else {
        skipped += 1;
      }
    } catch (err) {
      if (isMissingDataAssetTable(err)) {
        return {
          ok: false,
          skipped: true,
          rollupsUpdated: 0,
          learningRecomputed: 0,
        };
      }
      skipped += 1;
    }
  }

  let userProfilesRecomputed = 0;
  for (const uid of userIds) {
    try {
      const row = await recomputeUserWritingProfile(db, uid);
      if (row) userProfilesRecomputed += 1;
    } catch {
      /* optional */
    }
  }

  return {
    ok: true,
    rollupsUpdated,
    learningRecomputed,
    userProfilesRecomputed,
    skipped,
    brandsProcessed: pairs.length,
  };
}
