import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { getLabRunStatus } from "@/lib/evolution-lab/labRunner";
import { loadLabRunFromDisk, loadLatestLabRunSync } from "@/lib/evolution-lab/state";
import { buildLabReport } from "@/lib/evolution-lab/labReport";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const runId = new URL(request.url).searchParams.get("runId");
  const active = getLabRunStatus();

  if (runId) {
    const disk = loadLabRunFromDisk(runId);
    if (disk) {
      return NextResponse.json({
        ok: true,
        report: disk.report || buildLabReport(disk),
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

  const latest = loadLatestLabRunSync();
  return NextResponse.json({
    ok: true,
    report: latest ? buildLabReport(latest) : null,
    status: latest?.status ?? "idle",
    runId: latest?.id ?? null,
    note: latest
      ? undefined
      : "실행 후 리포트가 생성됩니다. OPENAI_API_KEY가 필요합니다.",
  });
}
