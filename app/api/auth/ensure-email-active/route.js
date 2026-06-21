import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp, rateLimit429 } from "@/lib/api/rateLimit";
import { validateEmailFormat } from "@/lib/auth/checkEmailServer";
import {
  ENSURE_EMAIL_ACTIVE_MAX_AGE_MS,
  isRecentSignupUser,
  shouldAttemptEmailConfirmAfterAuthError,
  userNeedsEmailConfirm,
} from "@/lib/auth/ensureEmailActiveServer";
import { confirmSignupEmail } from "@/lib/auth/signupEmailConfirm";
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = createServiceSupabase();
  if (!url || !anon || !service) {
    return NextResponse.json(
      { ok: false, userMessage: "인증 서버를 사용할 수 없습니다." },
      { status: 503 }
    );
  }

  if (userIdHint) {
    const hinted = await confirmRecentSignupByUserId(
      service,
      userIdHint,
      emailCheck.value
    );
    if (hinted.ok) {
      return NextResponse.json({ ok: true, alreadyActive: hinted.alreadyActive });
    }
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
  if (error && !shouldAttemptEmailConfirmAfterAuthError(errMsg)) {
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

  if (!isRecentSignupUser(userRow.user)) {
    return NextResponse.json(
      { ok: false, userMessage: "이메일 또는 비밀번호가 맞지 않습니다." },
      { status: 401 }
    );
  }

  if (!userNeedsEmailConfirm(userRow.user)) {
    return NextResponse.json({ ok: true, alreadyActive: true });
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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} userId
 * @param {string} email
 */
async function confirmRecentSignupByUserId(service, userId, email) {
  const { data: userData, error: userError } =
    await service.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return { ok: false };
  }

  const userEmail = String(userData.user.email || "").trim().toLowerCase();
  if (userEmail !== String(email).trim().toLowerCase()) {
    return { ok: false };
  }

  if (!isRecentSignupUser(userData.user)) {
    return { ok: false };
  }

  if (!userNeedsEmailConfirm(userData.user)) {
    return { ok: true, alreadyActive: true };
  }

  try {
    await confirmSignupEmail(service, userId);
    return { ok: true, alreadyActive: false };
  } catch (err) {
    console.error("[api/auth/ensure-email-active:userId]", err);
    return { ok: false };
  }
}

export { ENSURE_EMAIL_ACTIVE_MAX_AGE_MS };
