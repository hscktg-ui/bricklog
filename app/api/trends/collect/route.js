import { NextResponse } from "next/server";
import { runTrendCollection } from "@/lib/trends/snapshotEngine";
import { saveSnapshot } from "@/lib/trends/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.CRON_SECRET || process.env.TREND_COLLECT_SECRET;
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

  try {
    const snapshot = await runTrendCollection();
    saveSnapshot(snapshot);
    return NextResponse.json({
      ok: true,
      dateKst: snapshot.dateKst,
      signalCount: snapshot.signals.length,
      hasVerifiedData: snapshot.hasVerifiedData,
      collectorStatus: snapshot.collectorStatus,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST with Bearer CRON_SECRET to collect trends (06:00 KST cron)",
  });
}
