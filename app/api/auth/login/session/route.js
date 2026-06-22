import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import { completeAuthSession } from "@/lib/auth/completeAuthSessionServer";

export const runtime = "nodejs";

const RATE_LIMIT_MSG = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";

/** 이메일·비밀번호 로그인 — 미확인 계정 자동 활성화 포함 */
export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`auth-login-session:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimit429(NextResponse, limit, RATE_LIMIT_MSG);
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
    const result = await completeAuthSession(body?.email, body?.password);
    if (!result.ok) {
      const status =
        result.code === "RATE_LIMIT"
          ? 429
          : result.code === "CONFIG" || result.code === "CONFIRM_FAILED"
            ? 503
            : 401;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/auth/login/session]", err);
    return NextResponse.json(
      { ok: false, userMessage: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
