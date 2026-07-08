import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { createServiceSupabase } from "@/lib/supabase/server";
import { adminCreateUser } from "@/lib/admin/createUser";
import { startOfTodayKstIso } from "@/lib/admin/kstTime";
import { formatUserAcquisitionBrief } from "@/lib/analytics/userAcquisition";
import {
  classifyMemberAudience,
  MEMBER_AUDIENCE_LABELS,
} from "@/lib/admin/memberAudience";

const PROFILE_FIELDS_FULL =
  "id, email, nickname, display_name, created_at, last_login_at, last_seen_at, role, acquisition_source_channel, acquisition_path, acquisition_referrer, acquisition_utm_source, acquisition_utm_medium, acquisition_utm_campaign, acquisition_recorded_at";

const PROFILE_FIELDS_BASE =
  "id, email, nickname, display_name, created_at, last_login_at, last_seen_at, role";

async function fetchProfileList(db, limit) {
  let res = await db
    .from("profiles")
    .select(PROFILE_FIELDS_FULL)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error && /acquisition_|column/i.test(res.error.message)) {
    const fallback = await db
      .from("profiles")
      .select(PROFILE_FIELDS_BASE)
      .order("created_at", { ascending: false })
      .limit(limit);
    return { ...fallback, acquisitionSchemaReady: false };
  }

  return { ...res, acquisitionSchemaReady: true };
}

function enrichUsersWithAcquisition(rows = []) {
  return rows.map((row) => {
    const audience = classifyMemberAudience(row.email);
    return {
      ...row,
      audience,
      audienceLabel: MEMBER_AUDIENCE_LABELS[audience],
      isExternal: audience === "external",
      acquisition: formatUserAcquisitionBrief(row),
    };
  });
}

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
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));
  const todayIso = startOfTodayKstIso();

  const [listRes, signupsTodayRes, totalRes] = await Promise.all([
    fetchProfileList(db, limit),
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
    users: enrichUsersWithAcquisition(listRes.data ?? []),
    acquisitionSchemaReady: listRes.acquisitionSchemaReady !== false,
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
