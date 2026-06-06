import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { aggregateFeedbackStats } from "@/lib/feedback/adminStats";
import { fetchAdminDashboardExtras } from "@/lib/admin/fetchDashboardData";
import { buildOperatorAdvisory } from "@/lib/admin/buildOperatorAdvisory";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, userMessage: "SUPABASE_SERVICE_ROLE_KEY가 필요합니다." },
      { status: 503 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [errorsRes, itemsTodayRes, eventsTodayRes, feedbackRes, brandsActiveRes] =
    await Promise.all([
      db
        .from("error_logs")
        .select("id, route, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
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
  }

  const { count: userCount } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { dashboard } = await fetchAdminDashboardExtras({
    userCount: userCount ?? 0,
    feedbackStats: feedbackStats?.feedbackTablesReady !== false ? feedbackStats : null,
  });

  const advisory = await buildOperatorAdvisory({
    db,
    dashboard,
    errors: errorsRes.data || [],
    feedback: feedbackStats,
    userCount: userCount ?? 0,
  });

  return NextResponse.json({ ok: true, advisory });
}
