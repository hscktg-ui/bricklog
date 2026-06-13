import { supabase } from "@/lib/supabaseClient";
import { isTechnicalErrorMessage } from "@/lib/generation/normalizeGenerationError";

const SESSION_READ_MS = 12_000;

async function readSessionOnce() {
  const { data } = await Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("session_read_timeout")), SESSION_READ_MS)
    ),
  ]);
  return data?.session?.access_token ?? null;
}

export async function getAccessToken() {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const token = await readSessionOnce();
      if (token) return token;
    } catch {
      /* retry below */
    }
    if (attempt === 0) {
      try {
        await supabase.auth.refreshSession();
      } catch {
        /* ignore — fall through to second read */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return null;
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
    let msg =
      err?.message === "Failed to fetch" ||
      err?.name === "TypeError"
        ? "인터넷 연결을 확인하고 다시 시도해 주세요."
        : err?.message || "네트워크 오류가 발생했습니다.";
    if (isTechnicalErrorMessage(msg)) {
      msg = "연결이 잠시 끊겼을 수 있어요. 다시 시도해 주세요.";
    }
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
