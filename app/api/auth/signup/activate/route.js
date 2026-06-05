import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { confirmSignupEmail } from "@/lib/auth/signupEmailConfirm";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTIVATE_MAX_AGE_MS = 30 * 60 * 1000;

/** 가입 직후 userId로 이메일 확인 처리 (휴대폰 인증 없는 모드) */
export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`signup-activate:${ip}`, {
    max: 15,
    windowMs: 60_000,
  });
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

  const userId = String(body?.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json(
      { ok: false, userMessage: "가입 정보가 없습니다." },
      { status: 400 }
    );
  }

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json(
      { ok: false, userMessage: "인증 서버를 사용할 수 없습니다." },
      { status: 503 }
    );
  }

  try {
    const { data: userData, error: userError } =
      await service.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { ok: false, userMessage: "가입 정보를 확인하지 못했습니다." },
        { status: 400 }
      );
    }

    const createdAt = userData.user.created_at
      ? new Date(userData.user.created_at).getTime()
      : 0;
    if (!createdAt || Date.now() - createdAt > ACTIVATE_MAX_AGE_MS) {
      return NextResponse.json(
        { ok: false, userMessage: "가입 직후에만 활성화할 수 있습니다." },
        { status: 400 }
      );
    }

    await confirmSignupEmail(service, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/auth/signup/activate]", err);
    return NextResponse.json(
      { ok: false, userMessage: "가입 활성화에 실패했습니다." },
      { status: 500 }
    );
  }
}
