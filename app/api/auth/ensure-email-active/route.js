import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { validateEmailFormat } from "@/lib/auth/checkEmailServer";
import { confirmSignupEmail } from "@/lib/auth/signupEmailConfirm";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 이메일 인증 링크 없이 로그인·가입 직후 이용 — 비밀번호 확인 후 계정 활성화
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`ensure-email-active:${ip}`, {
    max: 20,
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = createServiceSupabase();
  if (!url || !anon || !service) {
    return NextResponse.json(
      { ok: false, userMessage: "인증 서버를 사용할 수 없습니다." },
      { status: 503 }
    );
  }

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: emailCheck.value,
    password,
  });

  if (data?.session) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  const errMsg = String(error?.message || "");
  const unconfirmed = /email not confirmed/i.test(errMsg);
  if (error && !unconfirmed) {
    return NextResponse.json(
      { ok: false, userMessage: "이메일 또는 비밀번호가 맞지 않습니다." },
      { status: 401 }
    );
  }

  const { data: userRow, error: lookupErr } =
    await service.auth.admin.getUserByEmail(emailCheck.value);
  if (lookupErr || !userRow?.user?.id) {
    return NextResponse.json(
      { ok: false, userMessage: "계정을 찾지 못했습니다." },
      { status: 400 }
    );
  }

  try {
    await confirmSignupEmail(service, userRow.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/auth/ensure-email-active]", err);
    return NextResponse.json(
      { ok: false, userMessage: "계정 활성화에 실패했습니다." },
      { status: 500 }
    );
  }
}
