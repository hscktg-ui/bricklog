import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { startLabRun } from "@/lib/evolution-lab/labRunner";
import { getActiveLabRun } from "@/lib/evolution-lab/state";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;

  if (getActiveLabRun()?.status === "running") {
    return NextResponse.json({
      ok: false,
      userMessage: "이미 실행 중인 연구가 있습니다.",
    });
  }

  const body = await request.json().catch(() => ({}));
  const result = await startLabRun(auth.user.id, {
    maxCount: Number(body.maxCount) || 100,
    maxHours: Number(body.durationHours ?? body.maxHours) || 4,
    durationHours: Number(body.durationHours ?? body.maxHours) || 4,
    targetScore: Number(body.targetScore) || 90,
    includeSensitive: body.includeSensitive !== false,
    categories: body.categories,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, userMessage: result.message },
      { status: result.runId ? 409 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    runId: result.runId,
    userMessage: "네이버 블로그 품질 연구를 시작했습니다.",
  });
}
