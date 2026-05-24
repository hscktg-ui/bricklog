import { createServiceSupabase } from "@/lib/supabase/server";

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailFormat(email) {
  const v = String(email || "").trim().toLowerCase();
  if (!v) return { ok: false, message: "이메일을 입력해 주세요." };
  if (!EMAIL_RE.test(v)) return { ok: false, message: "이메일 형식을 확인해 주세요." };
  return { ok: true, value: v };
}

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
    const { data, error } = await service.auth.admin.getUserByEmail(check.value);
    if (error) {
      const msg = String(error.message || "");
      if (/not found|no user|User not found/i.test(msg)) {
        return { ok: true, registered: false };
      }
      throw error;
    }
    return { ok: true, registered: Boolean(data?.user?.id) };
  } catch (err) {
    console.error("[checkEmail]", err);
    return {
      ok: false,
      reason: "config",
      message: "이메일 확인에 실패했습니다.",
    };
  }
}
