import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireVerifiedUser } from "@/lib/api/auth";
import { checkContentGeneration } from "@/lib/billing/checkEntitlement";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import {
  createBlogAsyncJob,
  blogAsyncJobSnapshot,
} from "@/lib/generation/blogAsyncJob";
import { BRICLOG_TIMING_DEFAULTS } from "@/lib/config/briclogDefaults";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_BLOG_RATE_LIMIT_PER_MIN) || 8;

export async function POST(request) {
  await hydrateGlobalEngineForGeneration();

  const ip = getClientIp(request);
  const limit = checkRateLimit(`blog-async-start:${ip}`, {
    max: MAX_PER_MIN,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const auth = await requireVerifiedUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const entitlement = await checkContentGeneration(
    auth.supabase,
    auth.user.id,
    auth.user.email
  );
  if (!entitlement.ok) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: entitlement.userMessage,
        usageWarning: entitlement.usageWarning,
        usage: entitlement.usage,
      },
      { status: 429 }
    );
  }

  const rawInput = await request.json();
  const job = await createBlogAsyncJob({
    supabase: auth.supabase,
    userId: auth.user.id,
    rawInput,
    planId: entitlement.usage?.planId || "free",
  });

  return NextResponse.json({
    ok: true,
    mode: "async_job",
    jobId: job.id,
    pollUrl: `/api/content/blog/async/${job.id}`,
    runUrl: `/api/content/blog/async/${job.id}/run`,
    pollIntervalMs: BRICLOG_TIMING_DEFAULTS.asyncPollIntervalMs,
    snapshot: blogAsyncJobSnapshot(job),
  });
}
