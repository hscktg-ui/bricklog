import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/cronAuth";
import { runNightlyEvolutionPipeline } from "@/lib/cron/nightlyEvolutionPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handleNightlyEvolution(request) {
  const authz = authorizeCronRequest(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
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

/** Vercel Cron Jobs invoke GET with Bearer CRON_SECRET · KST 01:30 */
export async function GET(request) {
  return handleNightlyEvolution(request);
}

export async function POST(request) {
  return handleNightlyEvolution(request);
}
