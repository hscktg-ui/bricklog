import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

export const runtime = "nodejs";

/** POST — 익명 방문 기록 (관리자 오늘 방문자 집계) */
export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`visit:${ip}`, { max: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: true, skipped: "rate_limit" });
  }

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json({ ok: true, skipped: "no_service" });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }

  const sessionId = String(body.sessionId || "").slice(0, 64);
  if (!sessionId) {
    return NextResponse.json({ ok: false, userMessage: "sessionId required" }, { status: 400 });
  }

  const { error } = await service.from("site_visits").insert({
    session_id: sessionId,
    path: String(body.path || "/").slice(0, 300),
    referrer: String(body.referrer || "").slice(0, 500),
    user_agent: String(body.userAgent || request.headers.get("user-agent") || "")
      .slice(0, 300),
  });

  if (error) {
    if (/site_visits|relation|does not exist/i.test(error.message)) {
      return NextResponse.json({ ok: true, skipped: "table_missing" });
    }
    return NextResponse.json({ ok: false, userMessage: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
