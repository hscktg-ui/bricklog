import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { resolveLatestContentItemId } from "@/lib/feedback/server/resolveContentItem";
import { isMissingFeedbackTable } from "@/lib/feedback/server/feedback";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const channel = request.nextUrl.searchParams.get("channel") || "blog";
  const brandId = request.nextUrl.searchParams.get("brandId") || null;

  try {
    const contentItemId = await resolveLatestContentItemId(
      auth.supabase,
      auth.user.id,
      { brandId, channel }
    );
    return NextResponse.json({
      ok: true,
      contentItemId,
      found: Boolean(contentItemId),
    });
  } catch (err) {
    if (isMissingFeedbackTable(err)) {
      return NextResponse.json({
        ok: true,
        contentItemId: null,
        found: false,
        memoryReady: false,
      });
    }
    console.error("[api/feedback/content-item]", err);
    return NextResponse.json(
      { ok: false, userMessage: "콘텐츠 연결을 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
