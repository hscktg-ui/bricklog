import { createServiceSupabase } from "@/lib/supabase/server";
import { validateEmailFormat } from "@/lib/auth/emailFormat";
import { lookupAuthUserByEmail } from "@/lib/auth/lookupAuthUserByEmail";

export { validateEmailFormat } from "@/lib/auth/emailFormat";

/**
 * @returns {Promise<
 *   | { ok: true, registered: boolean, deferred?: boolean }
 *   | { ok: false, reason: "config", message: string }
 * >}
 */
export async function resolveEmailRegistered(emailRaw) {
  const check = validateEmailFormat(emailRaw);
  if (!check.ok) {
    return { ok: true, registered: false, deferred: false };
  }

  const service = createServiceSupabase();
  if (!service) {
    return {
      ok: false,
      reason: "config",
      message: "이메일 확인을 지금 사용할 수 없습니다.",
    };
  }

  try {
    const { user, error } = await lookupAuthUserByEmail(service, check.value);
    if (error) throw error;
    return { ok: true, registered: Boolean(user?.id) };
  } catch (err) {
    console.error("[checkEmail]", err);
    return {
      ok: false,
      reason: "config",
      message: "이메일 확인에 실패했습니다.",
    };
  }
}
