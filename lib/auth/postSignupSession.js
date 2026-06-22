/**
 * 클라이언트 로그인·가입 직후 세션 — 서버 /api/auth/login/session SSOT
 */

import { supabase } from "@/lib/supabaseClient";
import { POST_SIGNUP_SIGNIN_ATTEMPTS } from "@/lib/auth/ensureEmailActiveServer";

export { POST_SIGNUP_SIGNIN_ATTEMPTS };

/**
 * @param {{ session?: import('@supabase/supabase-js').Session | null, user?: import('@supabase/supabase-js').User | null } | null | undefined} signUpData
 */
export async function applySignUpSession(signUpData) {
  if (!signUpData?.session?.access_token || !signUpData?.session?.refresh_token) {
    return null;
  }
  const { error } = await supabase.auth.setSession({
    access_token: signUpData.session.access_token,
    refresh_token: signUpData.session.refresh_token,
  });
  if (error) return null;
  return { session: signUpData.session, user: signUpData.user ?? null };
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function applyServerAuthSession(email, password) {
  const res = await fetch("/api/auth/login/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.session) {
    throw new Error(
      data.userMessage ||
        (res.status === 429
          ? "Request rate limit reached"
          : "로그인에 실패했습니다.")
    );
  }

  const { error } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (error) throw error;

  for (let i = 0; i < 4; i += 1) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      return sessionData;
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  throw new Error("로그인에 실패했습니다.");
}

/**
 * @param {string} email
 * @param {string} password
 * @param {{ userId?: string | null, signUpData?: { session?: import('@supabase/supabase-js').Session | null, user?: import('@supabase/supabase-js').User | null } | null, emailConfirmedOnServer?: boolean }} [opts]
 */
export async function signInAfterSignup(email, password, opts = {}) {
  const { signUpData = null } = opts;
  const fromSignUp = await applySignUpSession(signUpData);
  if (fromSignUp?.session) return fromSignUp;
  return applyServerAuthSession(email, password);
}

/** @deprecated use applyServerAuthSession */
export async function ensureEmailActive(email, password, userId = null) {
  void userId;
  try {
    await applyServerAuthSession(email, password);
    return { ok: true, rateLimited: false };
  } catch (err) {
    if (/rate limit/i.test(String(err?.message || ""))) {
      return { ok: false, rateLimited: true };
    }
    return { ok: false, rateLimited: false };
  }
}
