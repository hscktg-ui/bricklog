import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getQualityOpsSnapshotAsync } from "@/lib/admin/qualityOpsSnapshot";
import { fetchAdminLiveMetrics } from "@/lib/admin/liveMetrics";
import { fetchSignupFunnelMetrics } from "@/lib/admin/signupFunnelMetrics";

export const runtime = "nodejs";

/**
 * Lightweight admin refresh — live + funnel + quality ops only.
 */
export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase();
  if (!db) {
    return NextResponse.json({
      ok: false,
      userMessage: "SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    });
  }

  const [live, funnel] = await Promise.all([
    fetchAdminLiveMetrics(db).catch(() => null),
    fetchSignupFunnelMetrics(db).catch(() => null),
  ]);

  return NextResponse.json(
    {
      ok: true,
      live,
      funnel,
      qualityOps: await getQualityOpsSnapshotAsync(),
      pulsedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    }
  );
}
