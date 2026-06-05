import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isMissingPhoneOtpTable } from "@/lib/auth/phoneOtpServer";
import { getSmsReadiness, hasServiceRole } from "@/lib/sms/smsReadiness";
import { isSmsConfigured } from "@/lib/sms/sendSms";

export const runtime = "nodejs";

async function probeOtpTable() {
  const client = createServiceSupabase();
  if (!client) return { ready: false, reason: "no_service_role" };
  const { error } = await client
    .from("phone_otp_verifications")
    .select("id")
    .limit(1);
  if (!error) return { ready: true };
  if (isMissingPhoneOtpTable(error)) {
    return { ready: false, reason: "missing_table" };
  }
  return { ready: false, reason: error.code || "db_error" };
}

/** GET — 클라이언트/운영 점검용 (민감 정보 없음) */
export async function GET() {
  const readiness = getSmsReadiness();
  const otpTable = await probeOtpTable();
  const ready =
    readiness.ready && otpTable.ready && isSmsConfigured();

  let message = readiness.message;
  if (readiness.ready && !otpTable.ready) {
    message =
      "문자 인증 DB(phone_otp_verifications)가 없습니다. Supabase SQL Editor에서 supabase/schema-v14-phone-sms.sql 을 실행해 주세요.";
  }

  return NextResponse.json({
    ok: ready,
    code: !otpTable.ready ? "SMS_DB" : readiness.code,
    message,
    devMode: readiness.devMode,
    hasServiceRole: hasServiceRole(),
    hasOtpTable: otpTable.ready,
  });
}
