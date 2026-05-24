/** OAuth·이메일 인증 후 돌아올 URL (Supabase Redirect URLs에 등록 필요) */

export function getAuthCallbackUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}
