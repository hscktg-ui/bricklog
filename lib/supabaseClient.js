import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

const PLACEHOLDER_MARKERS = [
  "your-project",
  "your-anon",
  "xxxxx",
  "placeholder",
];

function isRealCredential(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

export const isSupabaseConfigured =
  isRealCredential(supabaseUrl) && isRealCredential(supabaseAnonKey);

/** 빌드·미설정 시에도 앱이 깨지지 않도록 placeholder 사용 */
const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseAnonKey || "placeholder-anon-key";

/**
 * 로그인 세션은 localStorage — /admin 등 새 탭·직접 URL에서도 세션 유지.
 * (이메일 저장 등 비민감 설정도 @see lib/auth/preferences.js)
 */
function migrateAuthSessionToLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    const storageKey = `sb-${ref}-auth-token`;
    const fromSession = window.sessionStorage.getItem(storageKey);
    const fromLocal = window.localStorage.getItem(storageKey);
    if (!fromLocal && fromSession) {
      window.localStorage.setItem(storageKey, fromSession);
    }
  } catch {
    /* ignore */
  }
}

migrateAuthSessionToLocalStorage();

const briclogAuthStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: briclogAuthStorage,
  },
});
