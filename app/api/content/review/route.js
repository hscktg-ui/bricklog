import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { getUsageSummary } from "@/lib/billing/usageLedger";
import { auditPastedDraft } from "@/lib/review/auditPastedDraft";
import {
  buildPasteReviewText,
  getPasteReviewChannel,
} from "@/lib/review/pasteChannelConfig";
import { logError } from "@/lib/api/logEvent";
import { mapServiceError } from "@/lib/errors/serviceMessages";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_PER_MIN = Number(process.env.BRICLOG_REVIEW_RATE_LIMIT_PER_MIN) || 10;

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`review:${ip}`, {
    max: MAX_PER_MIN,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    const channelId =
      body.channel === "place" || body.channel === "instagram"
        ? body.channel
        : "blog";
    const channelConfig = getPasteReviewChannel(channelId);

    const text =
      body.text?.trim()?.length > 0
        ? String(body.text).trim()
        : buildPasteReviewText(channelId, {
            draftTitle: body.title,
            draftBody: body.text,
            placeTitle: body.placeTitle ?? body.title,
            placeShort: body.placeShort ?? body.text,
            placeDetail: body.placeDetail,
            instaCaption: body.instaCaption ?? body.text,
            instaTags: body.instaTags,
          });

    const minChars = body.improve === true
      ? channelConfig.improveMinChars
      : channelConfig.auditMinChars;

    if (text.length < minChars) {
      return NextResponse.json({
        ok: false,
        userMessage: `${channelConfig.label} 글을 ${minChars}자 이상 입력해 주세요.`,
      });
    }

    const ctx = {
      brandName: body.brandName,
      region: body.region,
      mainKeyword: body.mainKeyword,
      excludePhrases: body.excludePhrases,
      speechStyle: body.speechStyle,
      placeTitle: body.placeTitle ?? body.title,
      placeShort: body.placeShort,
      placeDetail: body.placeDetail,
      blogLengthTier: body.blogLengthTier,
      emojiDensity: body.emojiDensity,
    };

    const audit = auditPastedDraft(text, ctx, channelId);
    const usage = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );

    if (body.improve === true) {
      return NextResponse.json({
        ok: true,
        mode: "audit",
        channel: channelId,
        audit,
        improvementSuggestions: audit.suggestions || [],
        userMessage:
          "검수는 문제점과 개선점만 제공합니다. 수정은 직접 하시거나 「이야기 쓰기」에서 새로 만들 수 있습니다.",
        usage,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "audit",
      channel: channelId,
      audit,
      usage,
    });
  } catch (err) {
    console.error("[api/content/review]", err);
    await logError({
      userId: auth.user.id,
      route: "/api/content/review",
      message: err.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        userMessage: mapServiceError("ai_generate"),
        error:
          process.env.NODE_ENV === "development" ? String(err.message) : undefined,
      },
      { status: 500 }
    );
  }
}
