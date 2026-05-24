import { computeBrandAssetRollup } from "@/lib/dataAsset/rollupBrandAssets";
import { isMissingDataAssetTable } from "@/lib/dataAsset/isMissingDataAssetTable";
import { formatBrandLearningBrief } from "@/lib/feedback/brandLearningProfile";

/**
 * 브랜드 데이터 자산 요약 (프롬프트·UI)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} brandId
 */
export async function getBrandAssetSummary(supabase, userId, brandId) {
  if (!brandId || !userId) {
    return { rollup: null, learningBrief: "", promptAddon: "", counts: {} };
  }

  let rollup = null;
  try {
    const { data: brandRow } = await supabase
      .from("brands")
      .select("brand_data_assets")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    rollup = brandRow?.brand_data_assets || null;

    const stale =
      !rollup?.recomputedAt ||
      Date.now() - new Date(rollup.recomputedAt).getTime() > 24 * 60 * 60 * 1000;

    if (!rollup?.generationCount || stale) {
      rollup = await computeBrandAssetRollup(supabase, userId, brandId);
    }
  } catch (err) {
    if (!isMissingDataAssetTable(err)) throw err;
    rollup = null;
  }

  let learningBrief = "";
  let profile = null;
  try {
    const { data } = await supabase
      .from("brand_learning_profiles")
      .select("profile, updated_at")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .maybeSingle();
    profile = data?.profile || null;
    if (profile) learningBrief = formatBrandLearningBrief(profile);
  } catch (err) {
    if (!isMissingDataAssetTable(err)) throw err;
  }

  const { buildDataAssetPromptAddon } = await import(
    "@/lib/dataAsset/buildAssetPromptAddon"
  );
  const promptAddon = buildDataAssetPromptAddon({ rollup, learningBrief, profile });

  const counts = {
    generations: rollup?.generationCount ?? 0,
    feedback: rollup?.feedbackCount ?? 0,
    events: rollup?.eventCount ?? 0,
    performance: rollup?.performanceCount ?? 0,
    hasLearning: !!profile || !!rollup?.hasStyleFingerprint,
  };

  return {
    rollup,
    learningBrief,
    profile,
    promptAddon,
    counts,
    continuityCopy:
      counts.generations > 0 || counts.feedback > 0
        ? "이 브랜드에 쌓인 기록은 계속 이어집니다"
        : "",
  };
}
