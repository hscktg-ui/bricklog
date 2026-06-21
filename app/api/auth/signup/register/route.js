import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import { registerSignupAccount } from "@/lib/auth/signupRegisterServer";
import { validateEmailFormat } from "@/lib/auth/checkEmailServer";

export const runtime = "nodejs";

const RATE_LIMIT_MSG = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 서버 가입 — admin.createUser로 Supabase 공개 signUp rate limit 회피
 */
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

  const emailCheck = validateEmailFormat(body?.email);
  const ip = getClientIp(request);

  if (emailCheck.ok) {
    const emailLimit = checkRateLimit(
      `signup-register:email:${emailCheck.value}`,
      { max: 8, windowMs: 60 * 60_000 }
    );
    if (!emailLimit.ok) {
      return rateLimit429(
        NextResponse,
        emailLimit,
        "같은 이메일로 가입 시도가 많습니다. 1시간 뒤 다시 시도해 주세요."
      );
    }
  }

  const ipLimit = checkRateLimit(`signup-register:ip:${ip}`, {
    max: 20,
    windowMs: 60_000,
  });
  if (!ipLimit.ok) {
    return rateLimit429(NextResponse, ipLimit, RATE_LIMIT_MSG);
  }

  try {
    const result = await registerSignupAccount({
      email: body?.email,
      password: body?.password,
      marketingAgreed: Boolean(body?.marketingAgreed),
      phone: body?.phone,
      phoneVerificationId: body?.phoneVerificationId,
    });

    if (!result.ok) {
      const status =
        result.code === "EMAIL_TAKEN" || result.code === "PHONE_TAKEN"
          ? 409
          : result.code === "CONFIG"
            ? 503
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/auth/signup/register]", err);
    return NextResponse.json(
      { ok: false, userMessage: "가입에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
