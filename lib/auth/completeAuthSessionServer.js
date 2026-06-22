import { createClient } from "@supabase/supabase-js";
import { validateEmailFormat } from "@/lib/auth/emailFormat";
import { lookupAuthUserByEmail } from "@/lib/auth/lookupAuthUserByEmail";
import {
  shouldAttemptEmailConfirmAfterAuthError,
  userNeedsEmailConfirm,
} from "@/lib/auth/ensureEmailActiveServer";
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
 * 로그인·가입 직후 — 미확인 이메일 계정 활성화 후 세션 발급 (가입 시각 제한 없음)
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

  let { session, error } = await signInWithPassword(emailCheck.value, pass);
  if (session) {
    return {
      ok: true,
      session: toClientSessionPayload(session),
      alreadyActive: true,
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

  const errMsg = String(error?.message || "");
  if (error && !shouldAttemptEmailConfirmAfterAuthError(errMsg)) {
    if (/rate limit/i.test(errMsg)) {
      return {
        ok: false,
        code: "RATE_LIMIT",
        userMessage: "요청이 너무 많습니다. 1~2분 후 다시 시도해 주세요.",
      };
    }
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      userMessage: "이메일 또는 비밀번호가 맞지 않습니다.",
    };
  }

  const { user, error: lookupErr } = await lookupAuthUserByEmail(
    service,
    emailCheck.value
  );
  if (lookupErr || !user?.id) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      userMessage: "이메일 또는 비밀번호가 맞지 않습니다.",
    };
  }

  if (userNeedsEmailConfirm(user)) {
    try {
      await confirmSignupEmail(service, user.id);
    } catch (confirmErr) {
      console.error("[completeAuthSession] confirm", confirmErr);
      return {
        ok: false,
        code: "CONFIRM_FAILED",
        userMessage: "계정 활성화에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    ({ session, error } = await signInWithPassword(emailCheck.value, pass));
    if (session) {
      return {
        ok: true,
        session: toClientSessionPayload(session),
        activated: true,
      };
    }
  }

  if (/rate limit/i.test(String(error?.message || ""))) {
    return {
      ok: false,
      code: "RATE_LIMIT",
      userMessage: "요청이 너무 많습니다. 1~2분 후 다시 시도해 주세요.",
    };
  }

  return {
    ok: false,
    code: "INVALID_CREDENTIALS",
    userMessage:
      "이메일 또는 비밀번호가 맞지 않습니다. 비밀번호 찾기를 이용해 주세요.",
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
