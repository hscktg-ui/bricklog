/** 이메일 링크 인증은 사용하지 않음 — 휴대폰 중복만 가입 시 검사 */
/** @param {{ emailVerified?: boolean, email_confirmed_at?: string | null, confirmed_at?: string | null, email?: string | null } | null | undefined} user */
export function isEmailVerified(user) {
  return Boolean(user);
}
