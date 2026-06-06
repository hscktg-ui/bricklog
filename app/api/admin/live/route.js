import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { fetchAdminLiveMetrics } from "@/lib/admin/liveMetrics";

export const runtime = "nodejs";

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

  const live = await fetchAdminLiveMetrics(db);
  return NextResponse.json({ ok: true, live });
}
