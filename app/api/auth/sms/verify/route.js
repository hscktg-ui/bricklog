import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import {
  isMissingPhoneOtpTable,
  verifyPhoneOtp,
} from "@/lib/auth/phoneOtpServer";

export const runtime = "nodejs";

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sms-verify:${ip}`, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyPhoneOtp(body?.phone ?? "", body?.code ?? "");
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, userMessage: result.message },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      verificationId: result.verificationId,
      phone: result.phone,
      userMessage: "휴대폰 인증이 완료되었습니다.",
    });
  } catch (err) {
    if (isMissingPhoneOtpTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "문자 인증 DB가 준비되지 않았습니다. Supabase에서 schema-v14-phone-sms.sql을 실행해 주세요.",
      });
    }
    console.error("[api/auth/sms/verify]", err);
    return NextResponse.json(
      { ok: false, userMessage: "인증번호 확인에 실패했습니다." },
      { status: 500 }
    );
  }
}
