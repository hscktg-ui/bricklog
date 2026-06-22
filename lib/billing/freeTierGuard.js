/**
 * 무료 플랜 일일 생성 상한 — 다계정·무한 생성 완화
 */
import { normalizePlanId } from "@/lib/billing/plans";

export const FREE_TIER_DAILY_CONTENT_CAP =
  Number(process.env.BRICLOG_FREE_DAILY_CONTENT_CAP) || 2;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} planId
 */
export async function checkFreeTierDailyContentCap(supabase, userId, planId) {
  if (normalizePlanId(planId) !== "free") {
    return { ok: true };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("action", ["blog_generate", "draft_review_improve"])
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[freeTierGuard]", error);
    return { ok: true };
  }

  const used = count ?? 0;
  if (used >= FREE_TIER_DAILY_CONTENT_CAP) {
    return {
      ok: false,
      userMessage: `무료 플랜은 하루 ${FREE_TIER_DAILY_CONTENT_CAP}회까지 생성할 수 있어요. 내일 다시 시도하거나 플랜 업그레이드를 확인해 주세요.`,
      used,
      limit: FREE_TIER_DAILY_CONTENT_CAP,
    };
  }

  return { ok: true, used, limit: FREE_TIER_DAILY_CONTENT_CAP };
}
