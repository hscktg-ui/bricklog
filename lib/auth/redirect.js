/** OAuth·이메일 인증 후 돌아올 URL (Supabase Redirect URLs에 등록 필요) */

function resolveAuthAppOrigin() {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  const host = window.location.hostname;
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");

  // 로컬 개발: 요청한 호스트 그대로 (localhost 메일 링크는 개발자만)
  if (host === "localhost" || host === "127.0.0.1") {
    return origin;
  }

  // 운영·스테이징: env에 등록된 공식 도메인 우선 (Vercel preview URL 방지)
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }

  return origin;
}

export function getAuthCallbackUrl() {
  const base = resolveAuthAppOrigin();
  return base ? `${base}/auth/callback` : undefined;
}

/** 비밀번호 재설정 메일 링크 — 새 비밀번호 입력 페이지 */
export function getResetPasswordUrl() {
  const base = resolveAuthAppOrigin();
  return base ? `${base}/auth/reset-password` : undefined;
}
