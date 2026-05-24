import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { logError } from "@/lib/api/logEvent";
import { mapSupabaseUserMessage } from "@/lib/api/supabaseErrors";

export const runtime = "nodejs";

/** DELETE — 로그인 사용자의 모든 브랜드 행 삭제 (RLS: user_id 일치) */
export async function DELETE(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { error, count } = await auth.supabase
    .from("brands")
    .delete({ count: "exact" })
    .eq("user_id", auth.user.id);

  if (error) {
    await logError({
      userId: auth.user.id,
      route: "/api/brands/reset DELETE",
      message: error.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        userMessage: mapSupabaseUserMessage(
          error,
          "브랜드를 초기화하지 못했습니다."
        ),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: count ?? 0,
    userMessage:
      "모든 브랜드가 삭제되었습니다. 이전 초안·기록은 계정에 남을 수 있습니다.",
  });
}
