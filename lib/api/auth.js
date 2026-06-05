import { createServerSupabase, getBearerToken } from "@/lib/supabase/server";

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

/** 생성·브랜드 추가 등 — 로그인 세션만 확인 (이메일 링크 인증 없음) */
export async function requireVerifiedUser(request) {
  return requireUser(request);
}

export function isAdminEmail(email) {
  const raw = (process.env.BRICLOG_ADMIN_EMAILS || "").trim();
  if (!raw || !email) return false;
  const list = raw.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
