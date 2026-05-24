import { NextResponse } from "next/server";
import { runDailyDevelopPipeline } from "@/lib/cron/dailyDevelopPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function getCronSecret() {
  return (
    process.env.BRICLOG_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.TREND_COLLECT_SECRET
  );
}

export async function POST(request) {
  const secret = getCronSecret();
  if (!secret?.trim()) {
    return NextResponse.json(
      { error: "cron_secret_not_configured" },
      { status: 503 }
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

export async function GET() {
  return NextResponse.json({
    message:
      "POST with Bearer CRON_SECRET. Runs yesterday KST usage aggregation + learning refresh. Schedule 00:00 KST. Operator digest (profiles, feedback) is in docs/daily-run-latest.md — optional 12:00 KST run for same-day preview: ?date=today with force=0.",
    query: "?date=YYYY-MM-DD&force=1",
  });
}
