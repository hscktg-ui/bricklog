import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/cronAuth";
import { runDailyDevelopPipeline } from "@/lib/cron/dailyDevelopPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handleDailyDevelop(request) {
  const authz = authorizeCronRequest(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const url = new URL(request.url);
  const snapshotDate = url.searchParams.get("date") || undefined;
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runDailyDevelopPipeline({ snapshotDate, force });
    if (!result.ok) {
      return NextResponse.json(result, { status: result.status || 500 });
    }
    const u = result.metrics?.usage || {};
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      snapshotDate: result.snapshotDate,
      ranAt: result.ranAt,
      signups: u.signups,
      contentItems: u.contentItems,
      avgQualityScore: u.avgQualityScore,
      brandsRecomputed: result.learning?.brandsRecomputed,
      insightsInserted: result.learning?.insightsInserted,
      persistedToDb: result.persistedToDb,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "pipeline_failed" },
      { status: 500 }
    );
  }
}

/** Vercel Cron Jobs invoke GET with Bearer CRON_SECRET */
export async function GET(request) {
  return handleDailyDevelop(request);
}

export async function POST(request) {
  return handleDailyDevelop(request);
}
