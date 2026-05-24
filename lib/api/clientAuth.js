import { supabase } from "@/lib/supabaseClient";

const SESSION_READ_MS = 8_000;

export async function getAccessToken() {
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("session_read_timeout")), SESSION_READ_MS)
      ),
    ]);
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchWithAuth(url, options = {}) {
  const { timeoutMs, signal: outerSignal, ...rest } = options;
  const token = await getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(rest.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller =
    timeoutMs && !outerSignal ? new AbortController() : null;
  const signal = outerSignal || controller?.signal;
  let timeoutId = null;
  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  let res;
  try {
    res = await fetch(url, { ...rest, headers, signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error("generation_timeout");
      timeoutErr.code = "GENERATION_TIMEOUT";
      timeoutErr.cause = err;
      throw timeoutErr;
    }
    const msg =
      err?.message === "Failed to fetch" ||
      err?.name === "TypeError"
        ? "인터넷 연결을 확인하고 다시 시도해 주세요."
        : err?.message || "네트워크 오류가 발생했습니다.";
    throw new Error(msg);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(
      data.userMessage || data.message || "요청에 실패했습니다."
    );
    err.status = res.status;
    err.code = data.code;
    err.missingTable = data.missingTable;
    err.payload = data;
    throw err;
  }
  return data;
}
