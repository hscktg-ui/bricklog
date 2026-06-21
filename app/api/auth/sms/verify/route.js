import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import {
  isMissingPhoneOtpTable,
  verifyPhoneOtp,
} from "@/lib/auth/phoneOtpServer";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";

export const runtime = "nodejs";

const RATE_LIMIT_MSG =
  "인증번호 확인 시도가 많습니다. 1~2분 후 다시 시도해 주세요.";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const norm = normalizeKoreanMobile(body?.phone ?? "");
  if (!norm.ok) {
    return NextResponse.json(
      { ok: false, userMessage: norm.message },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const phoneLimit = checkRateLimit(`sms-verify:phone:${norm.e164}`, {
    max: 10,
    windowMs: 5 * 60_000,
  });
  if (!phoneLimit.ok) {
    return rateLimit429(NextResponse, phoneLimit, RATE_LIMIT_MSG);
  }
  const ipLimit = checkRateLimit(`sms-verify:ip:${ip}`, {
    max: 120,
    windowMs: 60_000,
  });
  if (!ipLimit.ok) {
    return rateLimit429(NextResponse, ipLimit, RATE_LIMIT_MSG);
  }

  try {
    const purpose = String(body?.purpose || "signup").toLowerCase();
    const excludeUserId = body?.excludeUserId?.trim() || null;
    const result = await verifyPhoneOtp(body?.phone ?? "", body?.code ?? "", {
      excludeUserId,
      signupStrict: purpose === "signup",
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, userMessage: result.message, code: result.code },
        {
          status: result.code === "PHONE_TAKEN" ? 409 : 400,
        }
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
