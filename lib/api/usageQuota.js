const DAILY_LIMIT =
  Number(process.env.BRICLOG_DAILY_GENERATION_LIMIT) || 20;

export async function checkDailyBlogQuota(supabase, userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "blog_generate")
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[usageQuota]", error);
    return { ok: true };
  }

  if ((count ?? 0) >= DAILY_LIMIT) {
    return {
      ok: false,
      message: `오늘 생성 한도(${DAILY_LIMIT}회)를 모두 사용했습니다. 내일 다시 시도하거나 사이드바 「플랜 업그레이드」·「도움말」을 확인해 주세요.`,
      limit: DAILY_LIMIT,
      used: count,
    };
  }

  return { ok: true, limit: DAILY_LIMIT, used: count ?? 0 };
}

export async function recordBlogUsage(supabase, userId, meta = {}) {
  await supabase.from("usage_logs").insert({
    user_id: userId,
    action: "blog_generate",
    meta,
  });
}

export function getDailyLimit() {
  return DAILY_LIMIT;
}
