import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { getNightlyEvolutionActivityLog } from "@/lib/cron/nightlyEvolutionActivityLog";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const log = getNightlyEvolutionActivityLog();
  const limit = Math.min(
    20,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 12)
  );

  return NextResponse.json({
    ok: true,
    status: log.status || "idle",
    runId: log.runId || null,
    startedAt: log.startedAt || null,
    finishedAt: log.finishedAt || null,
    lastMessage: log.lastMessage || null,
    resultSummary: log.resultSummary || null,
    events: (log.events || []).slice(-limit).reverse(),
  });
}
