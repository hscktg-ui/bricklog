import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import {
  PHONE_ALREADY_REGISTERED_MESSAGE,
  resolvePhoneRegistered,
} from "@/lib/auth/checkPhoneServer";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";

export const runtime = "nodejs";

export async function GET(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`check-phone:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const phone = request.nextUrl.searchParams.get("phone") ?? "";
  const norm = normalizeKoreanMobile(phone);
  if (!norm.ok) {
    return NextResponse.json({
      ok: true,
      registered: false,
      valid: false,
      userMessage: norm.message,
    });
  }

  try {
    const result = await resolvePhoneRegistered(phone, null, {
      signupStrict: true,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, userMessage: result.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      registered: result.registered,
      valid: true,
      userMessage: result.registered
        ? PHONE_ALREADY_REGISTERED_MESSAGE
        : "사용 가능한 휴대폰 번호입니다.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "휴대폰 번호를 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
