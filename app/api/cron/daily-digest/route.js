import { NextResponse } from "next/server";
import { runNoonDigestPipeline } from "@/lib/cron/noonDigestPipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getCronSecret() {
  return (
    process.env.BRICLOG_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.TREND_COLLECT_SECRET
  );
}

/** KST 12:00 운영 피드백 — 당일 부분 집계 */
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

export async function GET() {
  return NextResponse.json({
    message:
      "POST Bearer CRON_SECRET at KST 12:00. Writes docs/daily-digest-noon.md (today partial usage + profile health).",
  });
}
