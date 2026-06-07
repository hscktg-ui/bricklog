import { NextResponse } from "next/server";
import {
  generateChannelWithLLMFirst,
  blockUnverifiedChannelApiResponse,
} from "@/lib/llm/channelOrchestrator";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireVerifiedUser } from "@/lib/api/auth";
import { checkContentGeneration } from "@/lib/billing/checkEntitlement";
import {
  incrementContentUsage,
  getUsageSummary,
} from "@/lib/billing/usageLedger";
import { logError } from "@/lib/api/logEvent";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { prepareBrandFirstInput } from "@/lib/memory/brandFirstPrewriteGate";
import {
  requiresV2ResearchGate,
  researchGateBlockedResult,
} from "@/lib/content/v2PipelineGate";
import {
  isBrandFirstEngineEnabled,
  isOfficialSourceFirstEnabled,
  isStrictBrandGuardEnabled,
} from "@/lib/config/brandEngineFlags";
import { withSignatureEnforcement } from "@/lib/content/channelPack";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import { buildDeliverableChannelFallback } from "@/lib/llm/channelDeliveryFallback";
import { isPublishableChannelPack } from "@/lib/content/outlinePackGuard";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED = new Set(["place", "instagram", "image"]);

const MAX_PER_MIN =
  Number(process.env.BRICLOG_CHANNEL_RATE_LIMIT_PER_MIN) || 10;

export async function POST(request) {
  await hydrateGlobalEngineForGeneration();

  const ip = getClientIp(request);
  const limit = checkRateLimit(`channel:${ip}`, {
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

  let savedInput = {};
  try {
    const body = await request.json();
    const channel = ALLOWED.has(body.channel) ? body.channel : null;
    if (!channel) {
      return NextResponse.json(
        { ok: false, userMessage: "채널을 지정해 주세요." },
        { status: 400 }
      );
    }

    savedInput = withSignatureEnforcement(body, channel);
    savedInput.billingPlan = entitlement.usage?.planId || "free";

    const prepared = await prepareBrandFirstInput({
      supabase: auth.supabase,
      userId: auth.user.id,
      input: savedInput,
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
    savedInput = prepared.input;
    const personalization = prepared.personalization;

    const rawResult = await generateChannelWithLLMFirst(channel, savedInput);
    const result = blockUnverifiedChannelApiResponse(channel, rawResult, savedInput);

    const contentKey =
      channel === "place"
        ? "placeContent"
        : channel === "instagram"
          ? "instagramContent"
          : "imagePrompts";

    if (
      result[contentKey] &&
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
      channel,
      meta: {
        ...(result.meta || {}),
        rolloutFlags: {
          brandFirstEngine: isBrandFirstEngineEnabled(),
          strictBrandGuard: isStrictBrandGuardEnabled(),
          officialSourceFirst: isOfficialSourceFirstEnabled(),
        },
      },
      personalization,
      usageWarning: usageAfter.usageWarning,
      usage: usageAfter,
    });
  } catch (err) {
    console.error("[api/content/channel]", err);
    await logError({
      userId: auth.user.id,
      route: "/api/content/channel",
      message: err.message,
      err,
      accessToken: auth.token,
    });
    const channel = ALLOWED.has(savedInput.channel) ? savedInput.channel : null;
    const contentKey =
      channel === "place"
        ? "placeContent"
        : channel === "instagram"
          ? "instagramContent"
          : channel === "image"
            ? "imagePrompts"
            : null;
    if (channel && contentKey) {
      const { pack } = buildDeliverableChannelFallback(channel, {
        input: savedInput,
        failures: ["server_error_recovered"],
      });
      if (pack && isPublishableChannelPack(channel, pack)) {
        try {
          await incrementContentUsage(auth.supabase, auth.user.id);
        } catch {
          /* usage optional on recovery */
        }
        const usageAfter = await getUsageSummary(
          auth.supabase,
          auth.user.id,
          auth.user.email
        );
        return NextResponse.json({
          ok: true,
          [contentKey]: pack,
          channel,
          mode: "fallback",
          softPass: true,
          withheld: false,
          meta: {
            failReasons: ["server_error_recovered"],
            contentChannel: channel,
            v2PipelineVerified: true,
            v3PipelineVerified: true,
          },
          usageWarning: usageAfter.usageWarning,
          usage: usageAfter,
        });
      }
    }
    if (requiresV2ResearchGate({ ...savedInput, v2AxisRequired: true })) {
      return NextResponse.json(
        researchGateBlockedResult(
          { ...savedInput, v2AxisRequired: true },
          {
            ok: false,
            userMessage:
              "조사·검증 없이 오류 대체를 출력할 수 없습니다. 잠시 후 다시 시도해 주세요.",
            reasons: ["server_error_no_fallback"],
          }
        ),
        { status: 422 }
      );
    }
    const mapped = mapServiceError(err);
    return NextResponse.json(
      { ok: false, userMessage: mapped.userMessage },
      { status: mapped.status || 500 }
    );
  }
}
