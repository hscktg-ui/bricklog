import { createClient } from "@supabase/supabase-js";

function resolveSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

function resolveAnonKey() {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

function resolveServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}

export function createServerSupabase(accessToken) {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveAnonKey();
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}

export function createServiceSupabase() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = resolveServiceRoleKey();
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
