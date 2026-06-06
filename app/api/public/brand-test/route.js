import { NextResponse } from "next/server";
import {
  assessPublicTestQuota,
  recordPublicTestRun,
} from "@/lib/publicTest/publicTestQuotaServer";
import { runPublicBrandTest } from "@/lib/publicTest/runPublicBrandTest";
import { PUBLIC_TEST_QUOTA_EXCEEDED } from "@/lib/publicTest/publicTestConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("sessionId") || "").slice(0, 64);
  const quota = assessPublicTestQuota(request, sessionId);
  return NextResponse.json({
    ok: true,
    remaining: quota.remaining ?? 0,
    used: quota.used ?? 0,
    resetsAt: quota.resetsAt,
    limited: !quota.ok,
  });
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  const sessionId = String(body.sessionId || "").slice(0, 64);
  const quota = assessPublicTestQuota(request, sessionId);
  if (!quota.ok) {
    return NextResponse.json({
      ok: false,
      withheld: true,
      quotaExceeded: true,
      userMessage: PUBLIC_TEST_QUOTA_EXCEEDED,
      quota: {
        remaining: 0,
        used: quota.used,
        resetsAt: quota.resetsAt,
      },
    });
  }

  const result = await runPublicBrandTest(body);
  const nextQuota = result.ok
    ? recordPublicTestRun(request, sessionId)
    : {
        remaining: quota.remaining,
        used: quota.used,
        resetsAt: quota.resetsAt,
      };

  if (!result.ok) {
    return NextResponse.json({
      ...result,
      quota: nextQuota,
    });
  }

  return NextResponse.json({
    ok: true,
    preview: result.preview,
    metrics: result.metrics,
    publishReady: result.publishReady === true,
    quota: nextQuota,
  });
}
