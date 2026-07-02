import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireVerifiedUser } from "@/lib/api/auth";
import { checkContentGeneration } from "@/lib/billing/checkEntitlement";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import { runBlogApiGeneration } from "@/lib/generation/blogApiHandler";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_BLOG_RATE_LIMIT_PER_MIN) || 8;

export async function POST(request) {
  await hydrateGlobalEngineForGeneration();

  const ip = getClientIp(request);
  const limit = checkRateLimit(`blog:${ip}`, {
    max: MAX_PER_MIN,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      },
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
  const { status, body } = await runBlogApiGeneration(auth, rawInput, {
    route: "/api/content/blog",
    planId: entitlement.usage?.planId || "free",
  });
  return NextResponse.json(body, { status });
}
