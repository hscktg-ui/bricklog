import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getDailyLimit } from "@/lib/api/usageQuota";
import { PLANS } from "@/lib/billing/plans";
import { aggregateFeedbackStats } from "@/lib/feedback/adminStats";
import { fetchAdminDashboardExtras } from "@/lib/admin/fetchDashboardData";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;


  const db = createServiceSupabase() || auth.supabase;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    brandsRes,
    gensTodayRes,
    usageTodayRes,
    errorsRes,
    contentItemsRes,
    brandAssetsRes,
    performanceRes,
    contentChannelRes,
    imageTodayRes,
    subsFreeRes,
    subsBrandRes,
    subsStudioRes,
    subsProRes,
    itemsTodayRes,
    eventsTodayRes,
    feedbackRes,
    brandsActiveRes,
  ] = await Promise.all([
    db.from("brands").select("id", { count: "exact", head: true }),
    db
      .from("generations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    db
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "blog_generate")
      .gte("created_at", todayIso),
    db
      .from("error_logs")
      .select("id, route, message, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("content_items").select("id", { count: "exact", head: true }),
    db.from("brand_assets").select("id", { count: "exact", head: true }),
    db.from("content_performance").select("id", { count: "exact", head: true }),
    db.from("content_items").select("channel"),
    db
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "image_generate")
      .gte("created_at", todayIso),
    db
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan", "free"),
    db
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan", "brand"),
    db
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("plan", ["studio", "pro"]),
    db
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan", "pro"),
    db
      .from("content_items")
      .select("id, channel, quality_score, prompt_input, brand_id")
      .gte("created_at", todayIso),
    db
      .from("content_events")
      .select("event_type, channel, brand_id")
      .gte("created_at", todayIso),
    db.from("content_feedback").select("reaction"),
    db
      .from("content_events")
      .select("brand_id")
      .gte("created_at", todayIso)
      .not("brand_id", "is", null),
  ]);

  const channelUsage = { blog: 0, place: 0, instagram: 0, image: 0, other: 0 };
  let memoryTablesReady = true;
  if (contentChannelRes.error) {
    memoryTablesReady = false;
  } else {
    for (const row of contentChannelRes.data || []) {
      const ch = row.channel || "other";
      if (channelUsage[ch] !== undefined) channelUsage[ch] += 1;
      else channelUsage.other += 1;
    }
  }

  const memoryStats = {
    memoryTablesReady,
    contentItemsCount: contentItemsRes.error ? null : contentItemsRes.count ?? 0,
    brandAssetsCount: brandAssetsRes.error ? null : brandAssetsRes.count ?? 0,
    performanceCount: performanceRes.error ? null : performanceRes.count ?? 0,
    channelUsage,
    aiFailuresToday: (errorsRes.data || []).filter((e) =>
      /memory|quality|openai|generate/i.test(String(e.route || "") + String(e.message || ""))
    ).length,
  };

  let feedbackStats = null;
  if (!itemsTodayRes.error && !eventsTodayRes.error) {
    const activeBrands = new Set(
      (brandsActiveRes.data || []).map((r) => r.brand_id)
    );
    feedbackStats = aggregateFeedbackStats({
      itemsToday: itemsTodayRes.data || [],
      eventsToday: eventsTodayRes.data || [],
      feedbackAll: feedbackRes.error ? [] : feedbackRes.data || [],
      brandsActive: activeBrands.size,
    });
  } else {
    feedbackStats = { feedbackTablesReady: false };
  }

  let userCount = null;
  const service = createServiceSupabase();
  if (service) {
    const { count, error } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (!error) userCount = count ?? 0;
  }

  const billing = {
    plans: PLANS,
    subscriptionsFree: subsFreeRes.error ? null : subsFreeRes.count ?? 0,
    subscriptionsBrand: subsBrandRes.error ? null : subsBrandRes.count ?? 0,
    subscriptionsStudio: subsStudioRes.error
      ? null
      : subsStudioRes.count ?? 0,
    subscriptionsProLegacy: subsProRes.error ? null : subsProRes.count ?? 0,
    contentLimitFree: PLANS.free.contentPerMonth,
    contentLimitBrand: PLANS.brand.contentPerMonth,
    contentLimitStudio: PLANS.studio.contentPerMonth,
    imageLimitBrand: PLANS.brand.imagesPerMonth,
    imageLimitStudio: PLANS.studio.imagesPerMonth,
    devProEnv: process.env.BRICLOG_DEV_PRO === "true",
  };

  const { dashboard, warnings: dashWarnings, warning: dashWarning } =
    await fetchAdminDashboardExtras({
      userCount,
      feedbackStats:
        feedbackStats?.feedbackTablesReady !== false ? feedbackStats : null,
    });

  const warnings = [];
  if (!service) {
    warnings.push(
      "SUPABASE_SERVICE_ROLE_KEY 없음 — 사용자 수는 표시되지 않을 수 있습니다.",
    );
  }
  if (dashWarning) warnings.push(dashWarning);
  if (dashWarnings?.length) warnings.push(...dashWarnings);

  return NextResponse.json({
    ok: true,
    stats: {
      userCount,
      brandCount: brandsRes.count ?? 0,
      generationsToday: gensTodayRes.count ?? 0,
      aiGenerationsToday: usageTodayRes.count ?? 0,
      openaiCallsToday: usageTodayRes.count ?? 0,
      imageGenerationsToday: imageTodayRes.error ? null : imageTodayRes.count ?? 0,
      dailyLimitPerUser: getDailyLimit(),
      memory: memoryStats,
      feedback: feedbackStats,
      billing,
      dashboard,
    },
    errors: errorsRes.data ?? [],
    warnings,
  });
}
