import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/cronAuth";
import { runNoonDigestPipeline } from "@/lib/cron/noonDigestPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleNoonDigest(request) {
  const authz = authorizeCronRequest(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const result = await runNoonDigestPipeline();
    if (!result.ok) {
      return NextResponse.json(result, { status: result.status || 500 });
    }
    return NextResponse.json({
      ok: true,
      snapshotDate: result.snapshotDate,
      path: result.path,
      signups: result.metrics?.usage?.signups,
      contentItems: result.metrics?.usage?.contentItems,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "noon_digest_failed" },
      { status: 500 }
    );
  }
}

/** Vercel Cron Jobs invoke GET with Bearer CRON_SECRET · KST 12:00 */
export async function GET(request) {
  return handleNoonDigest(request);
}

export async function POST(request) {
  return handleNoonDigest(request);
}
