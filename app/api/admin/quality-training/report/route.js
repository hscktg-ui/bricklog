import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { getRunStatus } from "@/lib/quality/training/runner";
import {
  loadRunFromDisk,
  loadLatestRunSync,
  getLatestReport,
} from "@/lib/quality/training/state";
import { buildTrainingReport } from "@/lib/quality/training/report";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const runId = new URL(request.url).searchParams.get("runId");
  const active = getRunStatus();

  if (runId) {
    const disk = loadRunFromDisk(runId);
    if (disk) {
      return NextResponse.json({
        ok: true,
        report: disk.report || buildTrainingReport(disk),
        status: disk.status,
        runId: disk.id,
      });
    }
  }

  if (active.report) {
    return NextResponse.json({
      ok: true,
      report: active.report,
      status: active.status,
      runId: active.runId,
    });
  }

  const latest = loadLatestRunSync();
  const report = getLatestReport() || (latest ? buildTrainingReport(latest) : null);

  return NextResponse.json({
    ok: true,
    report,
    status: latest?.status ?? "idle",
    runId: latest?.id ?? null,
    note: report
      ? undefined
      : "실제 평균 점수는 AI 생성 테스트 실행 후에만 집계됩니다.",
  });
}
