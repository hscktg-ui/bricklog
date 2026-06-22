import { createClient } from "@supabase/supabase-js";
import { validateEmailFormat } from "@/lib/auth/emailFormat";
import { lookupAuthUserByEmail } from "@/lib/auth/lookupAuthUserByEmail";
import { userNeedsEmailConfirm } from "@/lib/auth/ensureEmailActiveServer";
import { confirmSignupEmail } from "@/lib/auth/signupEmailConfirm";
import { createServiceSupabase } from "@/lib/supabase/server";

function createAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** @param {import('@supabase/supabase-js').Session} session */
export function toClientSessionPayload(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  };
}

/**
 * @param {string} email
 * @param {string} password
 */
async function signInWithPassword(email, password) {
  const client = createAnonAuthClient();
  if (!client) {
    return { session: null, error: new Error("auth_config_missing") };
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return { session: data?.session ?? null, error };
}

/**
 * 로그인·가입 직후 세션 — 이메일 링크 인증 없음, 레거시 미확인 계정은 서버에서 선활성화
 *
 * @param {string} emailRaw
 * @param {string} password
 */
export async function completeAuthSession(emailRaw, password) {
  const emailCheck = validateEmailFormat(emailRaw);
  if (!emailCheck.ok) {
    return { ok: false, code: "VALIDATION", userMessage: emailCheck.message };
  }

  const pass = String(password ?? "");
  if (pass.length < 6) {
    return {
      ok: false,
      code: "VALIDATION",
      userMessage: "비밀번호를 확인해 주세요.",
    };
  }

  const service = createServiceSupabase();
  if (!service) {
    return {
      ok: false,
      code: "CONFIG",
      userMessage: "인증 서버를 사용할 수 없습니다.",
    };
  }

  const { user, error: lookupErr } = await lookupAuthUserByEmail(
    service,
    emailCheck.value
  );
  if (lookupErr) {
    console.error("[completeAuthSession] lookup", lookupErr);
  }

  if (user?.id && userNeedsEmailConfirm(user)) {
    try {
      await confirmSignupEmail(service, user.id);
    } catch (confirmErr) {
      console.error("[completeAuthSession] confirm", confirmErr);
    }
  }

  const { session, error } = await signInWithPassword(emailCheck.value, pass);
  if (session) {
    return {
      ok: true,
      session: toClientSessionPayload(session),
      alreadyActive: true,
    };
  }

  const errMsg = String(error?.message || "");
  if (/rate limit/i.test(errMsg)) {
    return {
      ok: false,
      code: "RATE_LIMIT",
      userMessage: "요청이 너무 많습니다. 1~2분 후 다시 시도해 주세요.",
    };
  }

  if (!user?.id) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      userMessage: "이메일 또는 비밀번호가 맞지 않습니다.",
    };
  }

  return {
    ok: false,
    code: "INVALID_CREDENTIALS",
    userMessage:
      "비밀번호가 맞지 않습니다. 비밀번호 찾기로 재설정한 뒤 로그인해 주세요.",
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} userId
 * @param {string} emailRaw
 * @param {string} password
 */
export async function completeAuthSessionForUserId(
  service,
  userId,
  emailRaw,
  password
) {
  const emailCheck = validateEmailFormat(emailRaw);
  if (!emailCheck.ok || !userId) {
    return completeAuthSession(emailRaw, password);
  }

  const { data: userData, error: userError } =
    await service.auth.admin.getUserById(userId);
  if (
    userError ||
    !userData?.user ||
    String(userData.user.email || "").trim().toLowerCase() !== emailCheck.value
  ) {
    return completeAuthSession(emailRaw, password);
  }

  if (userNeedsEmailConfirm(userData.user)) {
    try {
      await confirmSignupEmail(service, userId);
    } catch (err) {
      console.error("[completeAuthSessionForUserId]", err);
    }
  }

  return completeAuthSession(emailRaw, password);
}
