/** 가입 직후 ensure-email-active — 이메일 확인 폴백 SSOT */

export const ENSURE_EMAIL_ACTIVE_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * @param {{ created_at?: string | null } | null | undefined} user
 * @param {number} [nowMs]
 */
export function isRecentSignupUser(user, nowMs = Date.now()) {
  if (!user?.created_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  return createdAt > 0 && nowMs - createdAt <= ENSURE_EMAIL_ACTIVE_MAX_AGE_MS;
}

/** @param {string} message */
export function shouldAttemptEmailConfirmAfterAuthError(message = "") {
  const m = String(message);
  return (
    /email not confirmed/i.test(m) || /invalid login credentials/i.test(m)
  );
}

/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 */
export function userNeedsEmailConfirm(user) {
  if (!user) return false;
  if (user.email_confirmed_at) return false;
  return true;
}
