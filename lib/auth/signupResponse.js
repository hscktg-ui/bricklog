/**
 * Supabase signUp (이메일 인증 ON) 시 기존 이메일이면 identities: [] 인 가짜 user를 반환합니다.
 * identities가 생략(undefined)된 성공 응답을 중복으로 오판하면 가입은 됐는데 오류만 보입니다.
 *
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 */
export function isObfuscatedDuplicateSignup(user) {
  if (!user || typeof user !== "object") return false;
  const identities = user.identities;
  if (!Array.isArray(identities) || identities.length > 0) return false;
  const confirmationSent =
    user.confirmation_sent_at ?? user.confirmationSentAt ?? null;
  return !confirmationSent;
}
