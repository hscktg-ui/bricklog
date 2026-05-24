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
 * 세션·토큰은 sessionStorage만 사용 (localStorage에는 이메일 등 비민감 설정만).
 * @see lib/auth/preferences.js
 */
const briclogAuthStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(key);
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
