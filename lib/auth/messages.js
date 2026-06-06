/** 로그인·가입 오류 → 사용자용 한국어 (기술 용어 노출 금지) */

const TECHNICAL =
  /supabase|auth|provider|token|session|jwt|oauth|refresh|bearer/i;

export function mapAuthError(message = "") {
  const m = String(message);
  if (/email not confirmed/i.test(m)) {
    return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (/invalid login credentials/i.test(m)) {
    return "이메일 또는 비밀번호가 맞지 않습니다.";
  }
  if (/user already registered/i.test(m)) {
    return "이미 가입된 이메일입니다. 로그인하거나 비밀번호를 잊으셨나요?를 이용해 주세요.";
  }
  if (/password should be at least/i.test(m)) {
    return "비밀번호는 6자 이상으로 설정해 주세요.";
  }
  if (/unable to validate email/i.test(m) || /invalid.*email/i.test(m)) {
    return "이메일 형식을 확인해 주세요.";
  }
  if (/rate limit/i.test(m)) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (/provider is not enabled|unsupported provider|validation failed/i.test(m)) {
    return "이 로그인 방식은 아직 사용할 수 없습니다. 이메일로 로그인해 주세요.";
  }
  if (/redirect|callback|url/i.test(m) && TECHNICAL.test(m)) {
    return "로그인 주소 설정이 맞지 않습니다. 관리자에게 문의해 주세요.";
  }
  if (/access_denied|user cancelled|cancelled/i.test(m)) {
    return "로그인이 취소되었습니다.";
  }
  if (/otp_expired|email link is invalid|has expired/i.test(m)) {
    return "재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해 주세요.";
  }
  if (/expired|invalid.*session/i.test(m)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (TECHNICAL.test(m)) {
    return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (m && !TECHNICAL.test(m)) {
    return m;
  }
  return "요청에 실패했습니다.";
}
