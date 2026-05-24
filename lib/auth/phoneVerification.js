import { isAdminEmail } from "@/lib/api/auth";

/** @param {{ phoneVerifiedAt?: string | null, contactPhone?: string | null, email?: string | null } | null | undefined} profile */
export function isPhoneVerified(profile) {
  if (!profile) return false;
  if (isAdminEmail(profile.email)) return true;
  return Boolean(profile.phoneVerifiedAt);
}

export const PHONE_VERIFY_USER_MESSAGE =
  "휴대폰 문자 인증이 필요합니다. 로그아웃 후 회원가입 화면에서 인증번호를 받아 주세요.";
