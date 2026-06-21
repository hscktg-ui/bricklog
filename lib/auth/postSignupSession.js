/**
 * 가입 직후 세션 확보 — signUp 세션 우선, ensure-email-active + 재시도
 */

import { supabase } from "@/lib/supabaseClient";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean(data.ok);
}

/**
 * @param {string} email
 * @param {string} password
 * @param {{ userId?: string | null, signUpData?: { session?: import('@supabase/supabase-js').Session | null, user?: import('@supabase/supabase-js').User | null } | null }} [opts]
 */
export async function signInAfterSignup(email, password, opts = {}) {
  const { userId = null, signUpData = null } = opts;
  const trimmed = email.trim();

  const fromSignUp = await applySignUpSession(signUpData);
  if (fromSignUp?.session) return fromSignUp;

  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(400 * attempt);

    let { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (data?.session) return data;
    lastError = error;

    const activated = await ensureEmailActive(trimmed, password, userId);
    if (!activated) continue;

    ({ data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    }));
    if (data?.session) return data;
    lastError = error;
  }

  if (lastError) throw lastError;
  throw new Error("로그인에 실패했습니다.");
}
