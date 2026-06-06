import { supabase } from "@/lib/supabaseClient";

async function applySessionPayload(session) {
  if (!session?.access_token || !session?.refresh_token) {
    return { ok: false, reason: "invalid_session_payload" };
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, session: data.session };
}

async function verifyTokenHashServer(tokenHash) {
  const res = await fetch("/api/auth/recovery/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token_hash: tokenHash }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.session) {
    return { ok: false, reason: data.userMessage || "verify_failed" };
  }
  return applySessionPayload(data.session);
}

function readUrlAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const hashParams = hash ? new URLSearchParams(hash) : null;
  return { params, hashParams };
}

/**
 * 비밀번호 재설정 메일 링크(token_hash·hash·code)로 세션 확보
 * @returns {Promise<{ ok: boolean, session?: import("@supabase/supabase-js").Session, reason?: string }>}
 */
export async function establishRecoverySessionFromUrl() {
  if (typeof window === "undefined") {
    return { ok: false, reason: "no_window" };
  }

  const { params, hashParams } = readUrlAuthParams();
  const tokenHash = params.get("token_hash");
  const queryType = params.get("type");
  const code = params.get("code");
  const linkError = params.get("error_description") || params.get("error");

  if (linkError) {
    return { ok: false, reason: String(linkError) };
  }

  // 메일 템플릿 직링크 (프리페치에 가장 안전)
  if (tokenHash && queryType === "recovery") {
    const clientTry = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!clientTry.error && clientTry.data?.session) {
      return { ok: true, session: clientTry.data.session };
    }
    return verifyTokenHashServer(tokenHash);
  }

  const accessToken = hashParams?.get("access_token");
  const refreshToken = hashParams?.get("refresh_token");
  if (accessToken && refreshToken) {
    return applySessionPayload({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      return { ok: true, session: data.session };
    }
    if (error) return { ok: false, reason: error.message };
  }

  for (const delay of [200, 500, 900]) {
    await new Promise((r) => setTimeout(r, delay));
    const { data, error } = await supabase.auth.getSession();
    if (error) return { ok: false, reason: error.message };
    if (data?.session) return { ok: true, session: data.session };
  }

  return { ok: false, reason: "no_session" };
}

export function isRecoveryRedirectUrl() {
  if (typeof window === "undefined") return false;
  const { params, hashParams } = readUrlAuthParams();
  if (params.get("type") === "recovery" || params.get("token_hash")) return true;
  if (params.get("error_code") === "otp_expired") return true;
  if (!hashParams) return false;
  return hashParams.get("type") === "recovery";
}

export function recoveryLinkErrorMessage(searchParams) {
  const code = searchParams?.get?.("error_code") || "";
  const desc = searchParams?.get?.("error_description") || searchParams?.get?.("error") || "";
  if (code === "otp_expired" || /invalid|expired/i.test(desc)) {
    return "재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해 주세요.";
  }
  if (searchParams?.get?.("error") === "expired") {
    return "재설정 링크가 만료되었습니다. 새 메일을 요청해 주세요.";
  }
  return null;
}
