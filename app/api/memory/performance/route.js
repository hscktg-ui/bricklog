import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { isMissingMemoryTable } from "@/lib/memory/server/memoryDb";
import { buildPerformanceFeedback } from "@/lib/memory/server/performanceAi";
import { sanitizeLogText } from "@/lib/feedback/sanitizeLog";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const contentItemId = new URL(request.url).searchParams.get("contentItemId");
  if (!contentItemId) {
    return NextResponse.json({ ok: true, performance: null });
  }

  try {
    const { data, error } = await auth.supabase
      .from("content_performance")
      .select("*")
      .eq("content_item_id", contentItemId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, performance: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_load") },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    const { data: item } = await auth.supabase
      .from("content_items")
      .select("title, channel")
      .eq("id", body.contentItemId)
      .eq("user_id", auth.user.id)
      .single();

    const { data: brandPatterns } = await auth.supabase
      .from("content_performance")
      .select("patterns")
      .eq("user_id", auth.user.id)
      .not("patterns", "eq", "[]");

    const mergedPatterns = [];
    for (const row of brandPatterns || []) {
      for (const p of row.patterns || []) mergedPatterns.push(p);
    }

    const ai = await buildPerformanceFeedback({
      reaction: body.reaction,
      memo: body.memo,
      title: item?.title,
      channel: item?.channel,
      patterns: mergedPatterns,
    });

    const row = {
      user_id: auth.user.id,
      content_item_id: body.contentItemId,
      views: Number(body.views) || 0,
      clicks: Number(body.clicks) || 0,
      inquiries: Number(body.inquiries) || 0,
      saves: Number(body.saves) || 0,
      comments: Number(body.comments) || 0,
      phone: Number(body.phone) || 0,
      reservations: Number(body.reservations) || 0,
      reaction: body.reaction || "",
      memo: sanitizeLogText(body.memo || ""),
      ai_feedback: ai.aiFeedback,
      patterns: ai.patterns,
    };

    const { data, error } = await auth.supabase
      .from("content_performance")
      .upsert(row, { onConflict: "content_item_id" })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, performance: data });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage: "성과 기록 기능을 준비 중입니다.",
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}
