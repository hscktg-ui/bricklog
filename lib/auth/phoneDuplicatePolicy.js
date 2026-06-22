/**
 * 가입 휴대폰 중복 방지 — 운영 SSOT (문자 인증 = 계정당 1번호)
 */

export const PHONE_DUPLICATE_BLOCK_MESSAGE =
  "이미 가입에 사용된 휴대폰 번호입니다. 기존 계정으로 로그인해 주세요.";

export const PHONE_DUPLICATE_PENDING_MESSAGE =
  "이미 등록 절차에 사용 중인 번호입니다. 기존 계정으로 로그인하거나 비밀번호 찾기를 이용해 주세요.";

/** @param {{ phone_verified_at?: string | null } | null | undefined} profileRow */
export function profileRowBlocksPhoneSignup(profileRow, signupStrict = false) {
  if (!profileRow) return false;
  if (signupStrict) return true;
  return Boolean(profileRow.phone_verified_at);
}

/** @param {boolean} signupStrict */
export function phoneDuplicateUserMessage(signupStrict = false) {
  return signupStrict
    ? PHONE_DUPLICATE_BLOCK_MESSAGE
    : PHONE_DUPLICATE_BLOCK_MESSAGE;
}
