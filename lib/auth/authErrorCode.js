import { mapAuthError } from "@/lib/auth/messages";

/**
 * Auth 오류 → admin 집계용 코드 + 사용자 메시지
 * @returns {{ code: string, message: string }}
 */
export function classifyAuthError(message = "") {
  const m = String(message || "");
  const messageOut = mapAuthError(m);

  if (/email not confirmed/i.test(m)) {
    return { code: "email_not_confirmed", message: messageOut };
  }
  if (/invalid login credentials/i.test(m)) {
    return { code: "invalid_credentials", message: messageOut };
  }
  if (/user already registered/i.test(m)) {
    return { code: "already_registered", message: messageOut };
  }
  if (/password should be at least/i.test(m)) {
    return { code: "password_too_short", message: messageOut };
  }
  if (/unable to validate email/i.test(m) || /invalid.*email/i.test(m)) {
    return { code: "invalid_email", message: messageOut };
  }
  if (/rate limit/i.test(m)) {
    return { code: "rate_limit", message: messageOut };
  }
  if (/provider is not enabled|unsupported provider|validation failed/i.test(m)) {
    return { code: "provider_disabled", message: messageOut };
  }
  if (/access_denied|user cancelled|cancelled/i.test(m)) {
    return { code: "cancelled", message: messageOut };
  }
  if (/otp_expired|email link is invalid|has expired/i.test(m)) {
    return { code: "link_expired", message: messageOut };
  }
  if (/expired|invalid.*session/i.test(m)) {
    return { code: "session_expired", message: messageOut };
  }
  return { code: "unknown", message: messageOut };
}
