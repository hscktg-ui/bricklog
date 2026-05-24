import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import {
  resolveEmailRegistered,
  validateEmailFormat,
} from "@/lib/auth/checkEmailServer";

export const runtime = "nodejs";

export async function GET(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`check-email:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

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
        ? "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요."
        : "사용 가능한 이메일입니다.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "이메일을 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
