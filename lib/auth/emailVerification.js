import { isAdminEmail } from "@/lib/api/auth";

/** @param {{ emailVerified?: boolean, email_confirmed_at?: string | null, confirmed_at?: string | null, email?: string | null } | null | undefined} user */
export function isEmailVerified(user) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  if (user.emailVerified === true) return true;
  if (user.emailVerified === false) return false;
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export const EMAIL_VERIFY_USER_MESSAGE =
  "이메일 인증을 완료한 뒤 이용할 수 있어요. 가입 메일의 인증 링크를 눌러 주세요.";
