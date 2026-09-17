import { NextResponse } from "next/server";
import { runLiveTrendHourly } from "@/lib/trends/liveEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const secret =
    process.env.BRICLOG_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.TREND_COLLECT_SECRET;
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
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const result = await runLiveTrendHourly({ force, trigger: "cron" });
    return NextResponse.json({
      ...result,
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
    message: "POST with Bearer CRON_SECRET to run hourly live trend collection.",
    query: "?force=1",
  });
}
