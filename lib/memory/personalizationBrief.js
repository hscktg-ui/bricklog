import { getBrandLearningBrief, formatBrandLearningBrief } from "@/lib/feedback/brandLearningProfile";
import {
  getUserWritingProfile,
  formatUserWritingBrief,
  recomputeUserWritingProfile,
} from "@/lib/memory/userWritingProfile";
import { loadBrandKnowledgeBrief } from "@/lib/memory/server/brandKnowledge";
import { formatStyleContinuityBrief } from "@/lib/llm/personalizationPrompt";
import { rowToBrand } from "@/lib/brands/brandMapper";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { getBrandAssetSummary } from "@/lib/dataAsset/getBrandAssetSummary";
import { fetchProfile } from "@/lib/auth/profileServer";
import { personalizationBriefFromProfile } from "@/lib/auth/profilePersonalization";
import { buildBrandMemoryBundleFromLayers } from "@/lib/memory/brandMemoryBundle";

/**
 * 3계층 개인화 브리프 로드 (계정 / 브랜드 / 피드백·동결로)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} [brandId]
 * @param {{ localBrandMemory?: object }} [options]
 */
export async function loadPersonalizationLayers(
  supabase,
  userId,
  brandId,
  options = {}
) {
  const local = options.localBrandMemory || null;
  const [userProfile, accountProfile, brandLearningBrief, brandKnowledgeBrief, brandRowRes, assetSummary] =
    await Promise.all([
      getUserWritingProfile(supabase, userId),
      fetchProfile(supabase, userId),
      brandId
        ? getBrandLearningBrief(brandId, supabase, userId)
        : Promise.resolve(""),
      brandId
        ? loadBrandKnowledgeBrief(supabase, userId, brandId)
        : Promise.resolve(""),
      brandId
        ? supabase
            .from("brands")
            .select("*")
            .eq("id", brandId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      brandId
        ? getBrandAssetSummary(supabase, userId, brandId)
        : Promise.resolve({ promptAddon: "", counts: {} }),
    ]);

  const userBrief = formatUserWritingBrief(userProfile);
  const accountBrief = personalizationBriefFromProfile(accountProfile);
  const feedbackBrief = brandLearningBrief || "";

  let styleContinuityBrief = "";
  if (brandId) {
    try {
      const { data } = await supabase
        .from("brand_learning_profiles")
        .select("profile")
        .eq("brand_id", brandId)
        .eq("user_id", userId)
        .maybeSingle();
      styleContinuityBrief = formatStyleContinuityBrief(data?.profile);
    } catch {
      /* optional table */
    }
  }

  const serverBrand = brandRowRes?.data ? rowToBrand(brandRowRes.data) : null;
  const mergedBrand = serverBrand
    ? { ...serverBrand, ...(local || {}) }
    : local;
  const localBrief = mergedBrand ? formatBrandHabitsBrief(mergedBrand) : "";

  const brandBrief = [localBrief, brandKnowledgeBrief]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 2000);

  const dataAssetBrief = assetSummary?.promptAddon || "";

  return buildBrandMemoryBundleFromLayers({
    userBrief,
    accountBrief,
    brandBrief,
    feedbackBrief,
    styleContinuityBrief,
    dataAssetBrief,
    assetCounts: assetSummary?.counts || {},
    brandKnowledgeBrief: brandKnowledgeBrief || "",
  });
}

/** @deprecated — use buildBrandMemoryBundleFromLayers */
export function buildCombinedPersonalizationAddon(layers) {
  return buildBrandMemoryBundleFromLayers(layers).combinedPromptAddon;
}

/** 서버 생성 API 공통 진입 */
export async function loadBrandMemoryBundle(
  supabase,
  userId,
  brandId,
  options = {}
) {
  return loadPersonalizationLayers(supabase, userId, brandId, options);
}

/**
 * 생성·피드백 후 백그라운드 집계
 */
export async function refreshPersonalizationAfterContent(
  supabase,
  userId,
  brandId
) {
  const tasks = [recomputeUserWritingProfile(supabase, userId)];
  if (brandId) {
    const { recomputeBrandLearningProfile } = await import(
      "@/lib/feedback/brandLearningProfile"
    );
    tasks.push(recomputeBrandLearningProfile(supabase, userId, brandId));
  }
  await Promise.all(tasks.map((p) => p.catch(() => null)));
}

export { formatBrandLearningBrief };
