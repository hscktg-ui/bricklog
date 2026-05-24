import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import {
  getRunStatus,
  getActiveRunId,
  tickTrainingRun,
} from "@/lib/quality/training/runner";
import { loadRunFromDisk, loadLatestRunSync } from "@/lib/quality/training/state";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;


  const runId =
    new URL(request.url).searchParams.get("runId") || getActiveRunId();

  const activeBefore = getRunStatus();
  if (activeBefore.status === "running") {
    try {
      await tickTrainingRun();
    } catch (err) {
      console.error("[quality-training/status tick]", err);
    }
  }

  if (runId) {
    const active = getRunStatus();
    if (active.runId === runId) {
      return NextResponse.json({
        ok: true,
        running: active.status === "running",
        run: {
          runId: active.runId,
          status: active.status,
          progress: active.progress,
        },
        stopReason: active.stopReason,
        report: active.report,
      });
    }
    const disk = loadRunFromDisk(runId);
    if (disk) {
      const avg =
        disk.results?.length > 0
          ? Math.round(
              (disk.results.reduce((a, r) => a + (r.finalScore || 0), 0) /
                disk.results.length) *
                10
            ) / 10
          : 0;
      return NextResponse.json({
        ok: true,
        running: disk.status === "running",
        run: {
          runId: disk.id,
          status: disk.status,
          progress: {
            completed: disk.results?.length ?? 0,
            total: disk.config?.maxCount,
            avgScore: avg,
          },
        },
        stopReason: disk.stopReason,
        report: disk.report,
      });
    }
  }

  const active = getRunStatus();
  if (active.runId) {
    return NextResponse.json({
      ok: true,
      running: active.status === "running",
      run: {
        runId: active.runId,
        status: active.status,
        progress: active.progress,
      },
      stopReason: active.stopReason,
      report: active.report,
    });
  }

  const latest = loadLatestRunSync();
  if (!latest) {
    return NextResponse.json({ ok: true, running: false, run: null });
  }

  return NextResponse.json({
    ok: true,
    running: false,
    run: { runId: latest.id, status: latest.status, progress: null },
    report: latest.report,
  });
}
