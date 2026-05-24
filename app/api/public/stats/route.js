import { NextResponse } from "next/server";
import { getPublicLandingStats } from "@/lib/landing/publicStats";
import { computeSeedStats } from "@/lib/landing/statsSeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function seedFallbackResponse() {
  const core = computeSeedStats();
  return {
    ok: true,
    mode: core.mode,
    cachedAt: new Date().toISOString(),
    statsDateKst: core.statsDateKst,
    metrics: core.metrics,
    fallback: true,
  };
}

export async function GET() {
  try {
    const stats = await getPublicLandingStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("[public/stats]", e);
    return NextResponse.json(seedFallbackResponse(), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
