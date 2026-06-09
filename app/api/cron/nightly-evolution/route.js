import { NextResponse } from "next/server";
import { runNightlyEvolutionPipeline } from "@/lib/cron/nightlyEvolutionPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const skipTraining = url.searchParams.get("skipTraining") === "1";
  const skipLab = url.searchParams.get("skipLab") === "1";

  try {
    const result = await runNightlyEvolutionPipeline({ skipTraining, skipLab });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "nightly_evolution_failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST with Bearer CRON_SECRET. Auto-approves insights, refreshes evolution rules, runs bounded quality training + evolution lab. Schedule 01:30 KST.",
    query: "?skipTraining=1&skipLab=1",
  });
}
