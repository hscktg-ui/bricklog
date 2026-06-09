import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";

export const PHONE_ALREADY_REGISTERED_MESSAGE =
  "이미 가입에 사용된 휴대폰 번호입니다. 기존 계정으로 로그인해 주세요.";

function rowPhoneMatches(row, e164) {
  if (!row?.contact_phone) return false;
  const norm = normalizeKoreanMobile(row.contact_phone);
  return norm.ok && norm.e164 === e164;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} e164
 * @param {string | null} excludeUserId
 * @param {{ signupStrict?: boolean }} opts
 */
async function scanProfilesForPhone(
  service,
  e164,
  excludeUserId,
  { signupStrict = false } = {}
) {
  let query = service
    .from("profiles")
    .select("id, contact_phone, phone_verified_at")
    .not("contact_phone", "is", null)
    .neq("contact_phone", "");

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  return (data || []).some((row) => {
    if (!rowPhoneMatches(row, e164)) return false;
    // 인증 완료된 번호만 중복 — metadata만 있는 미인증 번호는 차단하지 않음
    return Boolean(row.phone_verified_at);
  });
}

/**
 * @param {string} phoneRaw
 * @param {string | null} [excludeUserId]
 * @param {{ signupStrict?: boolean }} [opts]
 */
export async function resolvePhoneRegistered(
  phoneRaw,
  excludeUserId = null,
  { signupStrict = false } = {}
) {
  const norm = normalizeKoreanMobile(phoneRaw);
  if (!norm.ok) {
    return { ok: true, registered: false, valid: false };
  }

  const service = createServiceSupabase();
  if (!service) {
    return {
      ok: false,
      reason: "config",
      message: "휴대폰 번호 확인을 지금 사용할 수 없습니다.",
    };
  }

  try {
    const registered = await scanProfilesForPhone(
      service,
      norm.e164,
      excludeUserId,
      { signupStrict }
    );
    return {
      ok: true,
      registered,
      valid: true,
      phoneNormalized: norm.e164,
    };
  } catch (err) {
    console.error("[checkPhone]", err);
    return {
      ok: false,
      reason: "config",
      message: "휴대폰 번호 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}

/**
 * @param {string} phoneRaw
 * @param {string | null} [excludeUserId]
 * @param {{ signupStrict?: boolean }} [opts]
 */
export async function assertPhoneAvailableForSignup(
  phoneRaw,
  excludeUserId = null,
  { signupStrict = false } = {}
) {
  const result = await resolvePhoneRegistered(phoneRaw, excludeUserId, {
    signupStrict,
  });
  if (!result.ok) {
    return { ok: false, message: result.message, code: "PHONE_CHECK" };
  }
  if (result.registered) {
    return {
      ok: false,
      message: PHONE_ALREADY_REGISTERED_MESSAGE,
      code: "PHONE_TAKEN",
    };
  }
  return { ok: true, phoneNormalized: result.phoneNormalized };
}
