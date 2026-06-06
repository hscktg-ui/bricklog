import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  aggregateAdminFeedbackSummary,
  listAdminFeedback,
} from "@/lib/feedback/adminFeedbackList";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase() || gate.auth.supabase;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const reaction = searchParams.get("reaction");
  const days = searchParams.get("days");

  try {
    const [list, summary] = await Promise.all([
      listAdminFeedback(db, { limit, offset, reaction }),
      aggregateAdminFeedbackSummary(db, Number(days) || 7),
    ]);
    return NextResponse.json({ ok: true, ...list, summary });
  } catch (err) {
    const missing =
      err?.code === "42703" ||
      /intents|rewrite_round|content_feedback/.test(String(err?.message || ""));
    if (missing) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "피드백 확장 스키마가 필요합니다. Supabase에서 schema-v18-feedback-loop.sql을 실행해 주세요.",
        memoryReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "피드백 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
