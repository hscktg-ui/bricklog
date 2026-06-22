/**
 * 가입 폼 — 제출 전 차단 사유 (disabled 대신 토스트로 안내)
 */

/**
 * @param {{
 *   termsAgreed: boolean;
 *   emailRegistered: boolean;
 *   phoneOptional: boolean;
 *   phoneBlocksSignup: boolean;
 *   phoneAvailabilityBlocks: boolean;
 *   password: string;
 *   passwordConfirm: string;
 * }} input
 */
export function resolveSignupBlockReason(input) {
  if (!input.termsAgreed) {
    return "이용약관·개인정보처리방침에 동의해 주세요.";
  }
  if (input.emailRegistered) {
    return "이미 사용 중인 이메일입니다. 로그인 탭에서 시도해 주세요.";
  }
  if (input.phoneAvailabilityBlocks) {
    return "이미 등록된 휴대폰 번호입니다.";
  }
  if (!input.phoneOptional && input.phoneBlocksSignup) {
    return "휴대폰 문자 인증을 완료해 주세요.";
  }
  if (input.password.length < 6) {
    return "비밀번호는 6자 이상으로 설정해 주세요.";
  }
  if (!input.passwordConfirm.trim()) {
    return "비밀번호 확인을 입력해 주세요.";
  }
  if (input.password !== input.passwordConfirm) {
    return "비밀번호 확인이 일치하지 않습니다.";
  }
  return "";
}

/** @param {{ loading?: boolean; signupLimited?: boolean }} input */
export function isSignupSubmitLocked({ loading = false, signupLimited = false }) {
  return Boolean(loading || signupLimited);
}
