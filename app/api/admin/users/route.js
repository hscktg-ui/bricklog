import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { adminCreateUser } from "@/lib/admin/createUser";
import { startOfTodayKstIso } from "@/lib/admin/kstTime";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase();
  if (!db) {
    return NextResponse.json({
      ok: false,
      userMessage: "SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 30));
  const todayIso = startOfTodayKstIso();

  const [listRes, signupsTodayRes, totalRes] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id, email, nickname, display_name, created_at, last_login_at, last_seen_at, role"
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  if (listRes.error) {
    return NextResponse.json(
      { ok: false, userMessage: listRes.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    users: listRes.data ?? [],
    totalUsers: totalRes.error ? null : totalRes.count ?? 0,
    signupsToday: signupsTodayRes.error ? null : signupsTodayRes.count ?? 0,
  });
}

export async function POST(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const service = createServiceSupabase();
  if (!service) {
    return NextResponse.json({
      ok: false,
      userMessage: "SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    });
  }

  try {
    const body = await request.json();
    const result = await adminCreateUser(service, {
      email: body.email,
      password: body.password,
      nickname: body.nickname,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, userMessage: result.userMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: err?.message || "요청 처리 실패" },
      { status: 400 }
    );
  }
}
