import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { listPendingInsights } from "@/lib/feedback/globalInsights";
import { aggregateGlobalInsightCandidates } from "@/lib/feedback/globalInsights";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, userMessage: "서비스 역할 키가 필요합니다." },
      { status: 503 }
    );
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (refresh) {
    await aggregateGlobalInsightCandidates();
  }

  try {
    const insights = await listPendingInsights(db);
    return NextResponse.json({ ok: true, insights });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: err.message || "조회 실패" },
      { status: 500 }
    );
  }
}
