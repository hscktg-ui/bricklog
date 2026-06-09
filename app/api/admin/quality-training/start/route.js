import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { startTrainingRun } from "@/lib/quality/training/runner";
import { getActiveRun } from "@/lib/quality/training/state";
import {
  isManualEvolutionRunBlocked,
  NIGHTLY_EVOLUTION_SCHEDULE_KST,
} from "@/lib/config/nightlyEvolutionConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;

  if (isManualEvolutionRunBlocked()) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: `수동 실행은 꺼져 있습니다. 매일 KST ${NIGHTLY_EVOLUTION_SCHEDULE_KST} 야간 배치가 자동 실행됩니다.`,
        autoOnly: true,
      },
      { status: 403 }
    );
  }

  const existing = getActiveRun();
  if (existing?.status === "running") {
    return NextResponse.json({
      ok: false,
      userMessage:
        "이미 실행 중인 테스트가 있습니다. 중단 후 다시 시작해 주세요.",
    });
  }

  const body = await request.json().catch(() => ({}));
  const result = await startTrainingRun(auth.user.id, {
    maxCount: Number(body.maxCount) || 300,
    maxHours: Number(body.durationHours ?? body.maxHours) || 10,
    durationHours: Number(body.durationHours ?? body.maxHours) || 10,
    targetScore: Number(body.targetScore) || 90,
    includeSensitive: body.includeSensitive !== false,
    categories: body.categories,
    channels: body.channels,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, userMessage: result.message, runId: result.runId },
      { status: result.ok === false && result.runId ? 409 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    runId: result.runId,
    userMessage: "품질 자동 테스트를 시작했습니다.",
  });
}
