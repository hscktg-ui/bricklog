import { isAdminEmail } from "@/lib/api/auth";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth/legalVersions";
import { resolveAuthProvider } from "@/lib/auth/providers";
import { labelForRole } from "@/lib/auth/profileOptions";
import {
  normalizeNickname,
  validateSignupProfilePayload,
} from "@/lib/auth/signupProfile";
import {
  isMissingNicknameRpc,
  parseNicknameRpcPayload,
} from "@/lib/auth/nicknameRpc";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import {
  assertPhoneAvailableForSignup,
  PHONE_ALREADY_REGISTERED_MESSAGE,
} from "@/lib/auth/checkPhoneServer";
import {
  assertPhoneVerificationConsumable,
  consumePhoneVerification,
} from "@/lib/auth/phoneOtpServer";
import { maskContactPhone } from "@/lib/auth/maskContactPhone";

export function isMissingProfilesTable(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42P01" ||
    (/profiles/i.test(msg) && /does not exist|relation/i.test(msg))
  );
}

export function isMissingProfileColumn(error) {
  const msg = String(error?.message || error?.code || "");
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    /column.*does not exist/i.test(msg)
  );
}

export function profileSaveUserMessage(error, fallback = "프로필을 저장하지 못했습니다.") {
  if (isMissingProfilesTable(error)) {
    return "프로필 DB가 아직 준비되지 않았습니다. Supabase에서 setup-profiles-nickname-safe.sql을 실행해 주세요.";
  }
  if (isMissingProfileColumn(error)) {
    return "프로필 저장용 DB 컬럼이 부족합니다. Supabase SQL Editor에서 setup-profiles-v9b-columns.sql을 실행해 주세요.";
  }
  return fallback;
}

export function profileNeedsTermsConsent(profile) {
  if (!profile) return true;
  return !profile.terms_agreed_at || !profile.privacy_agreed_at;
}

/** Server-only: ADMIN only when email is on BRICLOG_ADMIN_EMAILS (never trust DB alone). */
export function withTrustedProfileRole(profile, email) {
  if (!profile) return null;
  const trustedRole = isAdminEmail(email) ? "ADMIN" : "USER";
  if (profile.role === trustedRole) return profile;
  return { ...profile, role: trustedRole };
}

export function rowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name ?? "",
    nickname: row.nickname ?? "",
    fullName: row.full_name ?? "",
    contactPhone: maskContactPhone(row.contact_phone) ?? null,
    companyName: row.company_name ?? "",
    businessName: row.business_name ?? "",
    jobTitle: row.job_title ?? "",
    roleType: row.role_type ?? "",
    preferredTitle: row.preferred_title ?? "디렉터님",
    mainBrandName: row.main_brand_name ?? "",
    mainIndustry: row.main_industry ?? "",
    brandCountBand: row.brand_count_band ?? "",
    primaryUseCase: row.primary_use_case ?? "",
    intendedBrandCount: row.intended_brand_count ?? null,
    provider: row.provider ?? "email",
    plan: row.plan ?? "FREE",
    role: row.role ?? "USER",
    termsAgreedAt: row.terms_agreed_at ?? null,
    privacyAgreedAt: row.privacy_agreed_at ?? null,
    marketingAgreedAt: row.marketing_agreed_at ?? null,
    termsVersion: row.terms_version ?? null,
    privacyVersion: row.privacy_version ?? null,
    profileCompletedAt: row.profile_completed_at ?? null,
    profileSetupSkippedAt: row.profile_setup_skipped_at ?? null,
    phoneVerifiedAt: row.phone_verified_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? null,
    needsTermsConsent: profileNeedsTermsConsent(row),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('@supabase/supabase-js').User} user
 */
/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} serviceSupabase
 * @param {string} nickname
 * @param {string} [excludeUserId]
 */
function escapeIlikeExact(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

async function nicknameTakenViaRpc(client, normalized, excludeUserId) {
  const { data, error } = await client.rpc("check_nickname_available", {
    p_nickname: normalized,
    p_exclude_user_id: excludeUserId || null,
  });
  if (!error) {
    const parsed = parseNicknameRpcPayload(data);
    if (parsed) return !parsed.available;
    return null;
  }
  if (isMissingNicknameRpc(error)) return null;
  throw error;
}

export async function isNicknameTaken(
  serviceSupabase,
  nickname,
  excludeUserId = null
) {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;

  const service = serviceSupabase || createServiceSupabase();
  if (service) {
    try {
      const viaRpc = await nicknameTakenViaRpc(
        service,
        normalized,
        excludeUserId
      );
      if (viaRpc !== null) return viaRpc;
    } catch (err) {
      if (!isMissingNicknameRpc(err)) throw err;
    }

    let query = service
      .from("profiles")
      .select("id, nickname")
      .not("nickname", "is", null)
      .neq("nickname", "");

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data: rows, error } = await query.limit(3000);
    if (error) throw error;

    const normLower = normalized.toLowerCase();
    return (rows || []).some(
      (r) => String(r.nickname || "").trim().toLowerCase() === normLower
    );
  }

  const anon = createServerSupabase();
  if (anon) {
    try {
      const viaRpc = await nicknameTakenViaRpc(anon, normalized, excludeUserId);
      if (viaRpc !== null) return viaRpc;
    } catch (err) {
      if (!isMissingNicknameRpc(err) && !isMissingProfilesTable(err)) {
        throw err;
      }
    }
  }

  return false;
}

/**
 * @param {string} userId
 * @param {string} verificationId
 * @param {string} phoneRaw
 */
export async function applyPhoneVerificationToProfile(
  userId,
  verificationId,
  phoneRaw
) {
  const check = await assertPhoneVerificationConsumable(
    verificationId,
    phoneRaw
  );
  if (!check.ok) {
    const err = new Error(check.message);
    err.code = "PHONE_NOT_VERIFIED";
    throw err;
  }

  const available = await assertPhoneAvailableForSignup(phoneRaw, userId, {
    signupStrict: true,
  });
  if (!available.ok) {
    const err = new Error(available.message);
    err.code = available.code || "PHONE_TAKEN";
    throw err;
  }

  const service = createServiceSupabase() || createServerSupabase();
  const now = new Date().toISOString();
  const { error } = await service
    .from("profiles")
    .update({
      contact_phone: check.phoneDisplay,
      contact_phone_normalized: check.phoneNormalized,
      phone_verified_at: now,
      updated_at: now,
    })
    .eq("id", userId);
  if (error) {
    if (error.code === "23505") {
      const err = new Error(PHONE_ALREADY_REGISTERED_MESSAGE);
      err.code = "PHONE_TAKEN";
      throw err;
    }
    throw error;
  }

  await consumePhoneVerification(verificationId);
  return { ok: true, phone: check.phoneDisplay };
}

export async function upsertProfileOnLogin(supabase, user) {
  const provider = resolveAuthProvider(user);
  const meta = user.user_metadata || {};
  const metaNickname = normalizeNickname(meta.nickname);
  const metaFullName =
    meta.full_name || meta.name || meta.fullName || "";
  const fallbackDisplay =
    metaNickname ||
    metaFullName ||
    (user.email ? user.email.split("@")[0] : "") ||
    "회원";
  const role = isAdminEmail(user.email) ? "ADMIN" : "USER";
  const now = new Date().toISOString();

  const pendingTerms =
    meta.terms_version === TERMS_VERSION && meta.terms_agreed === true;
  const pendingPrivacy =
    meta.privacy_version === PRIVACY_VERSION && meta.privacy_agreed === true;
  const pendingMarketing = Boolean(meta.marketing_agreed);

  const { data: existing } = await supabase
    .from("profiles")
    .select(
      "id, plan, nickname, full_name, contact_phone, business_name, job_title, intended_brand_count"
    )
    .eq("id", user.id)
    .maybeSingle();

  const patch = {
    email: user.email ?? "",
    provider,
    role,
    last_login_at: now,
    updated_at: now,
  };

  if (!existing?.nickname?.trim()) {
    patch.display_name = fallbackDisplay;
    if (metaNickname) patch.nickname = metaNickname;
  }
  if (!existing?.full_name?.trim() && metaFullName) {
    patch.full_name = String(metaFullName).trim();
  }
  if (!existing?.contact_phone && meta.contact_phone) {
    patch.contact_phone = String(meta.contact_phone).trim();
  }
  if (!existing?.business_name?.trim() && meta.business_name) {
    patch.business_name = String(meta.business_name).trim();
  }
  if (!existing?.job_title?.trim() && meta.job_title) {
    patch.job_title = String(meta.job_title).trim();
  }
  if (
    existing?.intended_brand_count == null &&
    meta.intended_brand_count != null &&
    meta.intended_brand_count !== ""
  ) {
    const n = Number.parseInt(String(meta.intended_brand_count), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 99) {
      patch.intended_brand_count = n;
    }
  }

  if (pendingTerms && pendingPrivacy) {
    patch.terms_agreed_at = now;
    patch.privacy_agreed_at = now;
    patch.terms_version = TERMS_VERSION;
    patch.privacy_version = PRIVACY_VERSION;
    if (pendingMarketing) patch.marketing_agreed_at = now;
  }

  let data;
  let error;

  if (existing) {
    ({ data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .single());
  } else {
    ({ data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        plan: "FREE",
        ...patch,
      })
      .select("*")
      .single());
  }

  if (error) throw error;

  const verificationId = meta.phone_verification_id;
  const phoneForVerify = meta.contact_phone;
  if (verificationId && phoneForVerify && !data?.phone_verified_at) {
    try {
      await applyPhoneVerificationToProfile(
        user.id,
        String(verificationId),
        String(phoneForVerify)
      );
      const { data: refreshed } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (refreshed) return rowToProfile(refreshed);
    } catch (e) {
      console.error("[profile] phone verification apply", e);
    }
  }

  return rowToProfile(data);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {Record<string, unknown>} raw
 */
function resolveStoredTitle(preferredTitle, customTitle) {
  if (preferredTitle === "custom") {
    const custom = String(customTitle || "").trim();
    if (!custom) return "디렉터님";
    return custom.endsWith("님") ? custom : `${custom}님`;
  }
  return preferredTitle || "디렉터님";
}

export async function updateSignupProfile(supabase, userId, raw) {
  if (raw && typeof raw === "object" && "role" in raw) {
    const err = new Error("role cannot be changed from the client.");
    err.code = "VALIDATION";
    throw err;
  }

  const now = new Date().toISOString();

  if (raw?.skipProfileSetup === true) {
    const skipPatch = {
      profile_setup_skipped_at: now,
      updated_at: now,
    };
    const { data: existingSkip } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    let data;
    let error;
    if (existingSkip?.id) {
      ({ data, error } = await supabase
        .from("profiles")
        .update(skipPatch)
        .eq("id", userId)
        .select("*")
        .single());
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      ({ data, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: user?.email ?? "",
          plan: "FREE",
          provider: resolveAuthProvider(user) || "email",
          role: isAdminEmail(user?.email) ? "ADMIN" : "USER",
          ...skipPatch,
        })
        .select("*")
        .single());
    }
    if (error) throw error;
    return rowToProfile(data);
  }

  const validated = validateSignupProfilePayload(raw, {
    strict: raw?.strict === true,
  });
  if (!validated.ok) {
    const err = new Error(validated.message);
    err.code = "VALIDATION";
    throw err;
  }

  const service = createServiceSupabase();
  const taken = await isNicknameTaken(
    service,
    validated.value.nickname,
    userId
  );
  if (taken) {
    const err = new Error(
      "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요."
    );
    err.code = "NICKNAME_TAKEN";
    throw err;
  }

  const storedTitle = resolveStoredTitle(
    validated.value.preferredTitle,
    validated.value.customTitle
  );

  const patch = {
    nickname: validated.value.nickname,
    full_name: validated.value.fullName,
    display_name: validated.value.nickname,
    contact_phone: validated.value.contactPhone,
    company_name: validated.value.companyName,
    business_name:
      validated.value.mainBrandName || validated.value.companyName || "",
    job_title: labelForRole(validated.value.roleType) || "",
    role_type: validated.value.roleType,
    preferred_title: storedTitle,
    main_brand_name: validated.value.mainBrandName,
    main_industry: validated.value.mainIndustry,
    brand_count_band: validated.value.brandCountBand,
    primary_use_case: validated.value.primaryUseCase,
    intended_brand_count: validated.value.intendedBrandCount,
    profile_completed_at: now,
    profile_setup_skipped_at: null,
    updated_at: now,
  };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  let data;
  let error;

  if (existing?.id) {
    ({ data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single());
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    ({ data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: user?.email ?? existing?.email ?? "",
        plan: "FREE",
        provider: resolveAuthProvider(user) || "email",
        role: isAdminEmail(user?.email) ? "ADMIN" : "USER",
        ...patch,
      })
      .select("*")
      .single());
  }

  if (error) {
    if (error.code === "23505") {
      const dup = new Error(
        "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요."
      );
      dup.code = "NICKNAME_TAKEN";
      throw dup;
    }
    throw error;
  }
  return rowToProfile(data);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return rowToProfile(data);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ marketing?: boolean }} options
 */
export async function recordTermsConsent(supabase, userId, options = {}) {
  const now = new Date().toISOString();
  const patch = {
    terms_agreed_at: now,
    privacy_agreed_at: now,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    updated_at: now,
  };
  if (options.marketing) {
    patch.marketing_agreed_at = now;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return rowToProfile(data);
}
