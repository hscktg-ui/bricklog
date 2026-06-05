import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { applyPhoneVerificationToProfile } from "@/lib/auth/profileServer";
import { isMissingPhoneOtpTable } from "@/lib/auth/phoneOtpServer";
import { isMissingProfilesTable } from "@/lib/auth/profileServer";
import { confirmSignupEmail } from "@/lib/auth/signupEmailConfirm";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SIGNUP_HOLD_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * 가입 직후 휴대폰 인증을 계정에 연결 (OTP 1회 소비 + 중복 번호 차단)
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`signup-phone-hold:${ip}`, {
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
  const phone = String(body?.phone ?? "").trim();
  const verificationId = String(body?.phoneVerificationId ?? "").trim();
  if (!userId || !phone || !verificationId) {
    return NextResponse.json(
      { ok: false, userMessage: "휴대폰 인증 정보가 없습니다." },
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
    if (!createdAt || Date.now() - createdAt > SIGNUP_HOLD_MAX_AGE_MS) {
      return NextResponse.json(
        { ok: false, userMessage: "가입 직후에만 휴대폰 인증을 연결할 수 있습니다." },
        { status: 400 }
      );
    }

    await applyPhoneVerificationToProfile(userId, verificationId, phone);
    await confirmSignupEmail(service, userId);

    return NextResponse.json({
      ok: true,
      userMessage: "휴대폰 인증이 계정에 연결되었습니다.",
    });
  } catch (err) {
    if (err.code === "PHONE_NOT_VERIFIED" || err.code === "PHONE_TAKEN") {
      return NextResponse.json(
        { ok: false, userMessage: err.message, code: err.code },
        { status: 400 }
      );
    }
    if (isMissingPhoneOtpTable(err) || isMissingProfilesTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "문자 인증 DB가 준비되지 않았습니다. schema-v14-phone-sms.sql을 실행해 주세요.",
      });
    }
    console.error("[api/auth/signup/phone-hold]", err);
    return NextResponse.json(
      { ok: false, userMessage: "휴대폰 인증 연결에 실패했습니다." },
      { status: 500 }
    );
  }
}
