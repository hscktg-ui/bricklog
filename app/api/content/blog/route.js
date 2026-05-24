import { NextResponse } from "next/server";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireVerifiedUser } from "@/lib/api/auth";
import {
  checkContentGeneration,
} from "@/lib/billing/checkEntitlement";
import {
  incrementContentUsage,
  getUsageSummary,
} from "@/lib/billing/usageLedger";
import { logError } from "@/lib/api/logEvent";
import { loadBrandMemoryBundle } from "@/lib/memory/personalizationBrief";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { buildDeliverableBlogFallback } from "@/lib/llm/blogDeliveryFallback";
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_BLOG_RATE_LIMIT_PER_MIN) || 8;

export async function POST(request) {
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

  let savedInput = {};
  try {
    const input = await request.json();
    savedInput = input;
    input.billingPlan = entitlement.usage?.planId || "free";
    let personalization = null;
    if (input.brandId || input.brandMemory) {
      personalization = await loadBrandMemoryBundle(
        auth.supabase,
        auth.user.id,
        input.brandId,
        { localBrandMemory: input.brandMemory }
      );
      input.accountBrief = personalization.accountBrief;
      input.userWritingBrief = personalization.userBrief;
      input.brandFeedbackBrief = personalization.feedbackBrief;
      input.styleContinuityBrief = personalization.styleContinuityBrief;
      input.brandKnowledgeBrief = personalization.brandKnowledgeBrief;
      if (personalization.brandBrief) {
        input.brandHabitsBrief = personalization.brandBrief;
      }
      input.personalizationAddon = personalization.combinedPromptAddon;
      input.combinedPersonalizationAddon = personalization.combinedPromptAddon;
    }
    const result = await generateBlogWithLLMFirst(input);

    if (
      result.blogContent &&
      !result.withheld &&
      (result.mode === "llm" || result.mode === "draft_fallback")
    ) {
      await incrementContentUsage(auth.supabase, auth.user.id);
    }

    const usageAfter = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );
    return NextResponse.json({
      ...result,
      personalization,
      usageWarning: usageAfter.usageWarning,
      usage: usageAfter,
    });
  } catch (err) {
    console.error("[api/content/blog]", err);
    await logError({
      userId: auth.user.id,
      route: "/api/content/blog",
      message: err.message,
      accessToken: auth.token,
    });
    try {
      const enriched = enrichMinimalBlogInput(savedInput);
      const { pack } = buildDeliverableBlogFallback({
        input: enriched,
        prep: { ok: false, reason: "server_error" },
        failures: ["server_error"],
      });
      return NextResponse.json({
        ok: true,
        mode: "draft_fallback",
        llmAvailable: false,
        blogContent: pack,
        softPass: true,
        withheld: false,
        meta: {
          generationMode: "server_error_fallback",
          draftFallback: true,
          blogCharCount: pack._meta?.charCount,
        },
        userMessage: null,
        userDetail: mapServiceError("ai_generate"),
        baseContentLabel: null,
      });
    } catch (fallbackErr) {
      console.error("[api/content/blog] fallback", fallbackErr);
      return NextResponse.json(
        {
          ok: false,
          mode: "error",
          llmAvailable: false,
          userMessage: mapServiceError("ai_generate"),
          error:
            process.env.NODE_ENV === "development"
              ? String(err.message)
              : undefined,
        },
        { status: 500 }
      );
    }
  }
}
