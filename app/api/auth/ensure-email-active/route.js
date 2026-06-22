import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import { validateEmailFormat } from "@/lib/auth/checkEmailServer";
import {
  completeAuthSession,
  completeAuthSessionForUserId,
} from "@/lib/auth/completeAuthSessionServer";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RATE_LIMIT_MSG = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 이메일 인증 링크 없이 로그인·가입 직후 이용 — 비밀번호 확인 후 계정 활성화
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
  if (!emailCheck.ok) {
    return NextResponse.json(
      { ok: false, userMessage: emailCheck.message },
      { status: 400 }
    );
  }

  const password = String(body?.password ?? "");
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, userMessage: "비밀번호를 확인해 주세요." },
      { status: 400 }
    );
  }

  const userIdHint = String(body?.userId ?? "").trim();
  const ip = getClientIp(request);

  if (userIdHint) {
    const userLimit = checkRateLimit(`ensure-email-active:user:${userIdHint}`, {
      max: 8,
      windowMs: 60_000,
    });
    if (!userLimit.ok) {
      return rateLimit429(NextResponse, userLimit, RATE_LIMIT_MSG);
    }
  } else {
    const ipLimit = checkRateLimit(`ensure-email-active:${ip}`, {
      max: 40,
      windowMs: 60_000,
    });
    if (!ipLimit.ok) {
      return rateLimit429(NextResponse, ipLimit, RATE_LIMIT_MSG);
    }
  }

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json(
      { ok: false, userMessage: "인증 서버를 사용할 수 없습니다." },
      { status: 503 }
    );
  }

  try {
    const result = userIdHint
      ? await completeAuthSessionForUserId(
          service,
          userIdHint,
          emailCheck.value,
          password
        )
      : await completeAuthSession(emailCheck.value, password);

    if (!result.ok) {
      const status =
        result.code === "RATE_LIMIT"
          ? 429
          : result.code === "CONFIG" || result.code === "CONFIRM_FAILED"
            ? 503
            : 401;
      return NextResponse.json(
        { ok: false, userMessage: result.userMessage, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyActive: Boolean(result.alreadyActive),
      activated: Boolean(result.activated),
    });
  } catch (err) {
    console.error("[api/auth/ensure-email-active]", err);
    return NextResponse.json(
      { ok: false, userMessage: "계정 활성화에 실패했습니다." },
      { status: 500 }
    );
  }
}

export { ENSURE_EMAIL_ACTIVE_MAX_AGE_MS } from "@/lib/auth/ensureEmailActiveServer";
