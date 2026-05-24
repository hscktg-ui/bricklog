import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { denyDataExportUnlessAdmin } from "@/lib/dataAsset/guardExport";
import { fetchDataAssetHealth } from "@/lib/dataAsset/adminHealth";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 운영자 전용 — 집계형 자산 건강 리포트만 (원문 덤프 없음)
 */
export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const db = createServiceSupabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, userMessage: "서비스 역할 키가 필요합니다." },
      { status: 503 }
    );
  }

  const health = await fetchDataAssetHealth(db);
  return NextResponse.json({
    ok: true,
    exportType: "aggregate_health_only",
    health,
    note: "No raw user content or PII in this export.",
  });
}

/** 일반 사용자·비관리자 raw 덤프 차단 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }
  return denyDataExportUnlessAdmin({ isAdmin: false });
}
