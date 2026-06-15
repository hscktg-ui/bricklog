import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  normalizeAcquisitionPayload,
  stampAcquisitionFromEarliestSessionVisit,
  stampUserAcquisitionIfEmpty,
} from "@/lib/analytics/userAcquisition";

export const runtime = "nodejs";

/** POST — 로그인 후 first-touch 유입 경로를 profiles에 1회 기록 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json({ ok: true, degraded: true, reason: "no_service" });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* optional */
  }

  const sessionId = String(body.sessionId || "").slice(0, 64);
  let result;

  if (body.path || body.referrer || body.utm_source || body.utmSource) {
    const payload = normalizeAcquisitionPayload(body);
    result = await stampUserAcquisitionIfEmpty(
      service,
      auth.user.id,
      payload,
      sessionId
    );
  } else if (sessionId) {
    result = await stampAcquisitionFromEarliestSessionVisit(
      service,
      auth.user.id,
      sessionId
    );
  } else {
    return NextResponse.json(
      { ok: false, userMessage: "sessionId 또는 first-touch payload 필요" },
      { status: 400 }
    );
  }

  if (result.reason === "schema_missing") {
    return NextResponse.json({
      ok: true,
      degraded: true,
      reason: "schema_v21_missing",
    });
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, userMessage: result.reason || "acquisition_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    stamped: result.stamped === true,
    skipped: result.skipped === true,
  });
}
