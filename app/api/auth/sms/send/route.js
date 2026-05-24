import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import {
  isMissingPhoneOtpTable,
  sendPhoneOtp,
} from "@/lib/auth/phoneOtpServer";
import { formatSmsSenderDisplay } from "@/lib/sms/smsDisplay";

export const runtime = "nodejs";

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sms-send:${ip}`, { max: 8, windowMs: 60_000 });
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
    const result = await sendPhoneOtp(body?.phone ?? "");
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          userMessage: result.message,
          code: result.code,
        },
        {
          status:
            result.code === "SMS_CONFIG" ||
            result.code === "SMS_SERVICE" ||
            result.code === "SMS_DB"
              ? 503
              : 400,
        }
      );
    }
    const senderDisplay = formatSmsSenderDisplay(
      process.env.SOLAPI_SENDER_PHONE
    );
    return NextResponse.json({
      ok: true,
      expiresInSec: result.expiresInSec,
      resendCooldownSec: 60,
      senderDisplay,
      userMessage: `인증번호를 보냈습니다. ${senderDisplay} 번호로 온 문자를 확인해 주세요.`,
      devHint: result.devHint,
    });
  } catch (err) {
    if (isMissingPhoneOtpTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "문자 인증 DB가 준비되지 않았습니다. Supabase에서 schema-v14-phone-sms.sql을 실행해 주세요.",
      });
    }
    console.error("[api/auth/sms/send]", err);
    return NextResponse.json(
      { ok: false, userMessage: "인증번호를 보내지 못했습니다." },
      { status: 500 }
    );
  }
}
