import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { runLiveTrendHourly } from "@/lib/trends/liveEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runLiveTrendHourly({ force, trigger: "admin" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "trend_run_failed" },
      { status: 500 }
    );
  }
}
