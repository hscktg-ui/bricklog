/**
 * 가입 시 휴대폰 OTP 연결 payload — phone optional/required 공통
 */

/**
 * @param {{
 *   phoneSmsVerified: boolean;
 *   phoneVerificationId: string | null;
 *   signupPhone: string;
 * }} input
 */
export function resolveSignupPhoneForSignup({
  phoneSmsVerified,
  phoneVerificationId,
  signupPhone,
}) {
  const phoneVerifiedForSignup =
    phoneSmsVerified &&
    Boolean(phoneVerificationId?.trim()) &&
    signupPhone.trim().length > 0;

  return {
    phoneVerifiedForSignup,
    contactPhone: phoneVerifiedForSignup ? signupPhone.trim() : "",
    signupPhoneVerificationId: phoneVerifiedForSignup
      ? phoneVerificationId.trim()
      : null,
  };
}

/** @param {{ hasSession: boolean; phoneHoldOk: boolean; activateOk?: boolean }} input */
export function isSignupEmailConfirmedOnServer({
  hasSession,
  phoneHoldOk,
  activateOk = false,
}) {
  return Boolean(hasSession || phoneHoldOk || activateOk);
}

/** @param {{ hasSession: boolean; phoneVerifiedForSignup: boolean; phoneHoldOk: boolean }} input */
export function shouldRunSignupActivate({ hasSession, phoneVerifiedForSignup, phoneHoldOk }) {
  if (hasSession) return false;
  if (phoneVerifiedForSignup) return !phoneHoldOk;
  return true;
}
