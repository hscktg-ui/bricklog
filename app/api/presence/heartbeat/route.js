import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";

export const runtime = "nodejs";

/** POST — 로그인 사용자 접속 유지 (관리자 현황용) */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const now = new Date().toISOString();
  let page = "/";
  try {
    const body = await request.json();
    page = String(body.page || "/").slice(0, 200);
  } catch {
    /* optional body */
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ last_seen_at: now })
    .eq("id", auth.user.id);

  if (error && /last_seen_at|column/i.test(error.message)) {
    return NextResponse.json({ ok: true, degraded: true, page });
  }

  if (error) {
    return NextResponse.json(
      { ok: false, userMessage: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, at: now, page });
}
