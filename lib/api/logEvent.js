import { createServiceSupabase, createServerSupabase } from "@/lib/supabase/server";

export async function logError({ userId, route, message, meta, accessToken }) {
  const row = {
    user_id: userId || null,
    route: route || "",
    message: String(message || "").slice(0, 2000),
    meta: meta || {},
  };

  const service = createServiceSupabase();
  const client =
    service ||
    (accessToken ? createServerSupabase(accessToken) : null);

  if (!client) {
    console.error("[error_log]", row);
    return;
  }

  try {
    await client.from("error_logs").insert(row);
  } catch (e) {
    console.error("[error_log insert]", e);
  }
}
