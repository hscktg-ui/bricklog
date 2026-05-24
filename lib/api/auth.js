import { createServerSupabase, getBearerToken } from "@/lib/supabase/server";
import {
  EMAIL_VERIFY_USER_MESSAGE,
  isEmailVerified,
} from "@/lib/auth/emailVerification";

export async function requireUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      error: { status: 401, message: "로그인이 필요합니다." },
    };
  }
  const supabase = createServerSupabase(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return {
      error: { status: 401, message: "세션이 만료되었습니다. 다시 로그인해 주세요." },
    };
  }
  return { user: data.user, supabase, token };
}

/** 생성·브랜드 추가 등 — 이메일 인증 완료 계정만 (휴대폰 인증은 가입 시에만) */
export async function requireVerifiedUser(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  if (!isEmailVerified(auth.user)) {
    return {
      error: {
        status: 403,
        message: EMAIL_VERIFY_USER_MESSAGE,
        code: "EMAIL_NOT_VERIFIED",
      },
    };
  }

  return auth;
}

export function isAdminEmail(email) {
  const raw = (process.env.BRICLOG_ADMIN_EMAILS || "").trim();
  if (!raw || !email) return false;
  const list = raw.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
