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
import { prepareBrandFirstInput } from "@/lib/memory/brandFirstPrewriteGate";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { buildDeliverableBlogFallback } from "@/lib/llm/blogDeliveryFallback";
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import {
  blockUnverifiedBlogApiResponse,
} from "@/lib/content/v2PipelineGate";
import {
  isBrandFirstEngineEnabled,
  isOfficialSourceFirstEnabled,
  isStrictBrandGuardEnabled,
} from "@/lib/config/brandEngineFlags";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import { slimBlogApiPayload } from "@/lib/generation/slimBlogApiPayload";
import {
  attachContentQualityToApiMeta,
  finalizeContentQualityForDelivery,
  hasSubstantiveLlmBody,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";

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

  let savedInput = {};
  try {
    const rawInput = await request.json();
    const input = slimBlogApiPayload(rawInput);
    savedInput = input;
    input.billingPlan = entitlement.usage?.planId || "free";
    const prepared = await prepareBrandFirstInput({
      supabase: auth.supabase,
      userId: auth.user.id,
      input,
    });
    if (!prepared.ok) {
      return NextResponse.json(
        {
          ok: false,
          mode: "brand_memory_gate",
          userMessage: prepared.userMessage,
        },
        { status: 422 }
      );
    }
    const personalization = prepared.personalization;
    const requestInput = prepared.input;
    requestInput.v2AxisRequired = requestInput.v2AxisRequired !== false;
    requestInput.v2PipelineEnforced = true;
    requestInput.v3EngineEnforced = true;
    requestInput.betaTestGuardEnforced = true;
    const rawResult = await generateBlogWithLLMFirst(requestInput);
    let result = blockUnverifiedBlogApiResponse(rawResult, requestInput);
    if (
      !result?.blogContent?.sections?.length &&
      hasSubstantiveLlmBody(rawResult?.blogContent, requestInput) &&
      isLlmOriginatedPack(rawResult?.blogContent, rawResult)
    ) {
      result = {
        ...rawResult,
        ok: true,
        withheld: false,
        softPass: false,
        userMessage: null,
        blogContent: finalizeContentQualityForDelivery(
          rawResult.blogContent,
          requestInput,
          "blog"
        ),
        meta: attachContentQualityToApiMeta(
          {
            ...(rawResult.meta || {}),
            llmApiInboundRescue: true,
            passOutput: true,
          },
          rawResult.blogContent
        ),
      };
    }
    if (result.blogContent?.sections?.length && !result.withheld) {
      result = {
        ...result,
        blogContent: finalizeContentQualityForDelivery(
          result.blogContent,
          requestInput,
          "blog"
        ),
      };
    }

    if (
      result.blogContent &&
      !result.withheld &&
      result.mode === "llm" &&
      (result.meta?.v2PipelineVerified || result.meta?.v3PipelineVerified)
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
      meta: attachContentQualityToApiMeta(
        {
          ...(result.meta || {}),
          rolloutFlags: {
            brandFirstEngine: isBrandFirstEngineEnabled(),
            strictBrandGuard: isStrictBrandGuardEnabled(),
            officialSourceFirst: isOfficialSourceFirstEnabled(),
          },
        },
        result.blogContent
      ),
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
      err,
      accessToken: auth.token,
    });
    try {
      const enriched = enrichMinimalBlogInput({
        ...slimBlogApiPayload(savedInput),
        v2PipelineEnforced: true,
        v3EngineEnforced: true,
        betaTestGuardEnforced: true,
      });
      const { pack } = buildDeliverableBlogFallback({
        input: enriched,
        prep: { ok: false, reason: "server_error" },
        failures: ["server_error"],
      });
      const blocked = blockUnverifiedBlogApiResponse(
        {
          ok: false,
          mode: "server_error",
          llmAvailable: false,
          blogContent: pack,
        },
        enriched
      );
      return NextResponse.json({
        ...blocked,
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
