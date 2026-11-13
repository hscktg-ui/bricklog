import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeCronRequest } from "@/lib/cron/cronAuth";
import { runLiveTrendHourly } from "@/lib/trends/liveEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function revalidatePublicTrendSurfaces() {
  try {
    revalidatePath("/");
    revalidatePath("/trend", "layout");
  } catch {
    /* ISR unavailable in some local/test runtimes */
  }
}

async function handleCollect(request) {
  const authz = authorizeCronRequest(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const result = await runLiveTrendHourly({ force, trigger: "cron" });
    if (result?.ok !== false) {
      revalidatePublicTrendSurfaces();
    }
    return NextResponse.json({
      ...result,
      revalidated: result?.ok !== false,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

/** Vercel Cron Jobs invoke GET with Bearer CRON_SECRET */
export async function GET(request) {
  return handleCollect(request);
}

export async function POST(request) {
  return handleCollect(request);
}
