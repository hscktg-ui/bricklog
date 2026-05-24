import { NextResponse } from "next/server";
import { getSmsReadiness, hasServiceRole } from "@/lib/sms/smsReadiness";

export const runtime = "nodejs";

/** GET — 클라이언트/운영 점검용 (민감 정보 없음) */
export async function GET() {
  const readiness = getSmsReadiness();
  return NextResponse.json({
    ok: readiness.ready,
    code: readiness.code,
    message: readiness.message,
    devMode: readiness.devMode,
    hasServiceRole: hasServiceRole(),
  });
}
