import { createClient } from "@supabase/supabase-js";
import { validateEmailFormat, resolveEmailRegistered } from "@/lib/auth/checkEmailServer";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth/legalVersions";
import { isSignupPhoneOptional } from "@/lib/config/productFlags";
import {
  applyPhoneVerificationToProfile,
  isMissingProfilesTable,
} from "@/lib/auth/profileServer";
import {
  isMissingPhoneOtpTable,
} from "@/lib/auth/phoneOtpServer";
import { createServiceSupabase } from "@/lib/supabase/server";

/**
 * @param {{
 *   email: string;
 *   password: string;
 *   marketingAgreed?: boolean;
 *   phone?: string;
 *   phoneVerificationId?: string | null;
 * }} input
 */
export async function registerSignupAccount(input) {
  const emailCheck = validateEmailFormat(input.email);
  if (!emailCheck.ok) {
    return { ok: false, userMessage: emailCheck.message, code: "VALIDATION" };
  }

  const password = String(input.password ?? "");
  if (password.length < 6) {
    return {
      ok: false,
      userMessage: "비밀번호는 6자 이상으로 설정해 주세요.",
      code: "VALIDATION",
    };
  }

  const phoneOptional = isSignupPhoneOptional();
  const phone = String(input.phone ?? "").trim();
  const phoneVerificationId = String(input.phoneVerificationId ?? "").trim();

  if (!phoneOptional && (!phone || !phoneVerificationId)) {
    return {
      ok: false,
      userMessage: "휴대폰 문자 인증을 완료해 주세요.",
      code: "PHONE_REQUIRED",
    };
  }

  const emailAvail = await resolveEmailRegistered(emailCheck.value);
  if (!emailAvail.ok) {
    return { ok: false, userMessage: emailAvail.message, code: "CONFIG" };
  }
  if (emailAvail.registered) {
    return {
      ok: false,
      userMessage:
        "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.",
      code: "EMAIL_TAKEN",
    };
  }

  const service = createServiceSupabase();
  if (!service) {
    return {
      ok: false,
      userMessage: "가입 서버를 사용할 수 없습니다.",
      code: "CONFIG",
    };
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: emailCheck.value,
    password,
    email_confirm: true,
    user_metadata: {
      terms_agreed: true,
      privacy_agreed: true,
      marketing_agreed: Boolean(input.marketingAgreed),
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      ...(phone ? { contact_phone: phone } : {}),
      ...(phoneVerificationId ? { phone_verification_id: phoneVerificationId } : {}),
    },
  });

  if (createErr) {
    const msg = String(createErr.message || "");
    if (/already|registered|exists/i.test(msg)) {
      return {
        ok: false,
        userMessage:
          "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.",
        code: "EMAIL_TAKEN",
      };
    }
    throw createErr;
  }

  const userId = created?.user?.id;
  if (!userId) {
    return {
      ok: false,
      userMessage: "가입 계정을 만들지 못했습니다.",
      code: "CREATE_FAILED",
    };
  }

  if (phoneVerificationId && phone) {
    try {
      await applyPhoneVerificationToProfile(userId, phoneVerificationId, phone);
    } catch (err) {
      if (err.code === "PHONE_NOT_VERIFIED" || err.code === "PHONE_TAKEN") {
        return {
          ok: false,
          userMessage: err.message,
          code: err.code,
        };
      }
      if (isMissingPhoneOtpTable(err) || isMissingProfilesTable(err)) {
        return {
          ok: false,
          userMessage:
            "문자 인증 DB가 준비되지 않았습니다. schema-v14-phone-sms.sql을 실행해 주세요.",
          code: "SMS_DB",
        };
      }
      throw err;
    }
  }

  const session = await issueSignupSession(emailCheck.value, password);
  if (session) {
    return {
      ok: true,
      userId,
      session,
      user: created.user,
    };
  }

  return {
    ok: true,
    userId,
    needsLogin: true,
    userMessage:
      "가입되었습니다. 로그인 화면에서 같은 이메일·비밀번호로 로그인해 주세요.",
  };
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function issueSignupSession(email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data?.session) return null;

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    token_type: data.session.token_type,
  };
}
