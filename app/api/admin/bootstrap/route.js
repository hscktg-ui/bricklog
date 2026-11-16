import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getDailyLimit } from "@/lib/api/usageQuota";
import { PLANS } from "@/lib/billing/plans";
import { aggregateFeedbackStats } from "@/lib/feedback/adminStats";
import { fetchAdminDashboardExtras } from "@/lib/admin/fetchDashboardData";
import { buildOperatorAdvisory } from "@/lib/admin/buildOperatorAdvisory";
import { getQualityOpsSnapshotAsync } from "@/lib/admin/qualityOpsSnapshot";
import { fetchAdminLiveMetrics } from "@/lib/admin/liveMetrics";
import { fetchSignupFunnelMetrics } from "@/lib/admin/signupFunnelMetrics";
import { startOfTodayKstIso } from "@/lib/admin/kstTime";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-shot admin shell payload — shares dashboard extras via short TTL cache.
 */
export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;

  const db = createServiceSupabase() || auth.supabase;
  if (!db) {
    return NextResponse.json(
      { ok: false, userMessage: "SUPABASE_SERVICE_ROLE_KEY가 필요합니다." },
      { status: 503 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIsoUtc = today.toISOString();
  const todayIsoKst = startOfTodayKstIso();

  const [
    brandsRes,
    gensTodayRes,
    usageTodayRes,
    errorsRes,
    contentItemsRes,
    brandAssetsRes,
    performanceRes,
    channelBlogRes,
    channelPlaceRes,
    channelInstagramRes,
    channelImageRes,
    imageTodayRes,
    subsFreeRes,
    subsBrandRes,
    subsStudioRes,
    subsProRes,
    itemsTodayRes,
    eventsTodayRes,
    feedbackRes,
    brandsActiveRes,
    live,
    funnel,
  ] = await Promise.all([
    db.from("brands").select("id", { count: "exact", head: true }),
    db
      .from("generations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIsoUtc),
    db
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "blog_generate")
      .gte("created_at", todayIsoUtc),
    db
      .from("error_logs")
      .select("id, route, message, created_at, user_id, meta")
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("content_items").select("id", { count: "exact", head: true }),
    db.from("brand_assets").select("id", { count: "exact", head: true }),
    db.from("content_performance").select("id", { count: "exact", head: true }),
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("channel", "blog"),
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("channel", "place"),
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("channel", "instagram"),
    db
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("channel", "image"),
    db
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "image_generate")
      .gte("created_at", todayIsoUtc),
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
      .gte("created_at", todayIsoKst),
    db
      .from("content_events")
      .select("event_type, channel, brand_id")
      .gte("created_at", todayIsoKst),
    db.from("content_feedback").select("reaction").limit(4000),
    db
      .from("content_events")
      .select("brand_id")
      .gte("created_at", todayIsoKst)
      .not("brand_id", "is", null),
    fetchAdminLiveMetrics(db).catch(() => null),
    fetchSignupFunnelMetrics(db).catch(() => null),
  ]);

  const { count: userCount } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true });

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

  const channelScanFailed = [
    channelBlogRes,
    channelPlaceRes,
    channelInstagramRes,
    channelImageRes,
  ].some((r) => r.error);

  const memoryStats = {
    memoryTablesReady: !contentItemsRes.error && !channelScanFailed,
    contentItemsCount: contentItemsRes.error ? null : contentItemsRes.count ?? 0,
    brandAssetsCount: brandAssetsRes.error ? null : brandAssetsRes.count ?? 0,
    performanceCount: performanceRes.error ? null : performanceRes.count ?? 0,
    channelUsage: {
      blog: channelBlogRes.error ? 0 : channelBlogRes.count ?? 0,
      place: channelPlaceRes.error ? 0 : channelPlaceRes.count ?? 0,
      instagram: channelInstagramRes.error ? 0 : channelInstagramRes.count ?? 0,
      image: channelImageRes.error ? 0 : channelImageRes.count ?? 0,
      other: 0,
    },
    aiFailuresToday: (errorsRes.data || []).filter((e) =>
      /memory|quality|openai|generate/i.test(
        String(e.route || "") + String(e.message || "")
      )
    ).length,
  };

  const billing = {
    plans: PLANS,
    subscriptionsFree: subsFreeRes.error ? null : subsFreeRes.count ?? 0,
    subscriptionsBrand: subsBrandRes.error ? null : subsBrandRes.count ?? 0,
    subscriptionsStudio: subsStudioRes.error ? null : subsStudioRes.count ?? 0,
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
      userCount: userCount ?? 0,
      feedbackStats:
        feedbackStats?.feedbackTablesReady !== false ? feedbackStats : null,
    });

  const warnings = [];
  if (dashWarning) warnings.push(dashWarning);
  if (dashWarnings?.length) warnings.push(...dashWarnings);

  const advisory = await buildOperatorAdvisory({
    db,
    dashboard,
    errors: errorsRes.data || [],
    feedback: feedbackStats,
    userCount: userCount ?? 0,
  });

  const qualityOps = await getQualityOpsSnapshotAsync();

  return NextResponse.json(
    {
      ok: true,
      stats: {
        userCount: userCount ?? 0,
        brandCount: brandsRes.count ?? 0,
        generationsToday: gensTodayRes.count ?? 0,
        aiGenerationsToday: usageTodayRes.count ?? 0,
        openaiCallsToday: usageTodayRes.count ?? 0,
        imageGenerationsToday: imageTodayRes.error
          ? null
          : imageTodayRes.count ?? 0,
        dailyLimitPerUser: getDailyLimit(),
        memory: memoryStats,
        feedback: feedbackStats,
        billing,
        dashboard,
      },
      errors: errorsRes.data ?? [],
      warnings,
      advisory,
      qualityOps,
      funnel,
      live,
      bootstrappedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    }
  );
}
