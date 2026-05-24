import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { getLabRunStatus, tickLabRun } from "@/lib/evolution-lab/labRunner";
import { loadLabRunFromDisk } from "@/lib/evolution-lab/state";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;
  const { auth } = gate;


  const active = getLabRunStatus();
  if (active.status === "running") {
    try {
      await tickLabRun();
    } catch (err) {
      console.error("[evolution-lab/status]", err);
    }
  }

  const status = getLabRunStatus();
  const runId = new URL(request.url).searchParams.get("runId");

  if (runId && status.runId !== runId) {
    const disk = loadLabRunFromDisk(runId);
    if (disk) {
      const scores = (disk.results || [])
        .map((r) => r.finalScore)
        .filter(Number.isFinite);
      return NextResponse.json({
        ok: true,
        running: disk.status === "running",
        run: {
          runId: disk.id,
          status: disk.status,
          progress: {
            completed: disk.results?.length ?? 0,
            total: disk.config?.maxCount,
            avgScore: scores.length
              ? Math.round(
                  (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
                ) / 10
              : 0,
          },
        },
        stopReason: disk.stopReason,
        report: disk.report,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    running: status.status === "running",
    run:
      status.runId == null
        ? null
        : {
            runId: status.runId,
            status: status.status,
            progress: status.progress,
          },
    stopReason: status.stopReason,
    report: status.report,
    phase: status.phase,
  });
}
