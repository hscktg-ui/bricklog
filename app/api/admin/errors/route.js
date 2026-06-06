import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase() || gate.auth.supabase;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 40));
  const since = searchParams.get("since");

  let query = db
    .from("error_logs")
    .select("id, route, message, meta, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, userMessage: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    errors: data ?? [],
    fetchedAt: new Date().toISOString(),
  });
}
