import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { approveInsight } from "@/lib/feedback/globalInsights";

export const runtime = "nodejs";

export async function POST(request) {
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

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json(
        { ok: false, userMessage: "인사이트 ID가 필요합니다." },
        { status: 400 }
      );
    }
    const insight = await approveInsight(db, body.id);
    return NextResponse.json({ ok: true, insight });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: err.message || "승인 실패" },
      { status: 500 }
    );
  }
}
