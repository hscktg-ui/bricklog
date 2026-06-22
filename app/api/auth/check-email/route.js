import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import {
  resolveEmailRegistered,
  validateEmailFormat,
} from "@/lib/auth/checkEmailServer";

export const runtime = "nodejs";

const RATE_LIMIT_MSG = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";

export async function GET(request) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const format = validateEmailFormat(email);
  if (!format.ok) {
    return NextResponse.json({
      ok: true,
      registered: false,
      valid: false,
      userMessage: format.message,
    });
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`check-email:${ip}`, {
    max: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimit429(NextResponse, limit, RATE_LIMIT_MSG);
  }

  try {
    const result = await resolveEmailRegistered(format.value);
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
        ? "이미 가입된 이메일입니다. 로그인 탭에서 기존 비밀번호로 로그인해 주세요."
        : "사용 가능한 이메일입니다.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "이메일을 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
