/**
 * 가입 직후 세션 확보 — signUp 세션 우선, 최소 API·Auth 호출
 */

import { supabase } from "@/lib/supabaseClient";
import { POST_SIGNUP_SIGNIN_ATTEMPTS } from "@/lib/auth/ensureEmailActiveServer";

export { POST_SIGNUP_SIGNIN_ATTEMPTS };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthRateLimitError(error) {
  return /rate limit/i.test(String(error?.message || ""));
}

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
 * @param {string | null | undefined} [userId]
 * @returns {Promise<{ ok: boolean, rateLimited?: boolean }>}
 */
export async function ensureEmailActive(email, password, userId = null) {
  const res = await fetch("/api/auth/ensure-email-active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      password,
      ...(userId ? { userId } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    return { ok: false, rateLimited: true };
  }
  return { ok: Boolean(res.ok && data.ok), rateLimited: false };
}

/**
 * @param {string} email
 * @param {string} password
 * @param {{ userId?: string | null, signUpData?: { session?: import('@supabase/supabase-js').Session | null, user?: import('@supabase/supabase-js').User | null } | null, emailConfirmedOnServer?: boolean }} [opts]
 */
export async function signInAfterSignup(email, password, opts = {}) {
  const {
    userId = null,
    signUpData = null,
    emailConfirmedOnServer = false,
  } = opts;
  const trimmed = email.trim();

  const fromSignUp = await applySignUpSession(signUpData);
  if (fromSignUp?.session) return fromSignUp;

  if (!emailConfirmedOnServer) {
    const activation = await ensureEmailActive(trimmed, password, userId);
    if (activation.rateLimited) {
      throw new Error("Request rate limit reached");
    }
  }

  let lastError = null;

  for (let attempt = 0; attempt < POST_SIGNUP_SIGNIN_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(700);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (data?.session) return data;

    lastError = error;
    if (isAuthRateLimitError(error)) break;
  }

  if (lastError) throw lastError;
  throw new Error("로그인에 실패했습니다.");
}
