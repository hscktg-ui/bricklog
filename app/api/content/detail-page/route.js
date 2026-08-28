import { NextResponse } from "next/server";
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
import { generateDetailPagePack } from "@/lib/product/detailPageEngine";
import {
  catchDetailPageFixes,
  improveDetailPagePack,
} from "@/lib/product/detailPageRevise";
import {
  renderDetailPageBodyHtml,
  wrapSmartstoreHtml,
  packToPlainText,
} from "@/lib/product/detailPageHtml";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_CHANNEL_RATE_LIMIT_PER_MIN) || 10;

function jsonPack(pack, extra = {}) {
  const html = renderDetailPageBodyHtml(pack, []);
  return {
    ok: true,
    channel: "detailPage",
    pack,
    html,
    documentHtml: wrapSmartstoreHtml(html),
    plainText: packToPlainText(pack),
    standard: pack._meta?.standard || null,
    meta: pack._meta,
    ...extra,
  };
}

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`detail-page:${ip}`, {
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

  try {
    const body = await request.json();
    const action = String(body.action || "generate");
    const prepared = await prepareBrandFirstInput({
      supabase: auth.supabase,
      userId: auth.user.id,
      input: {
        ...body,
        topic: body.productName || body.topic,
      },
    });
    const input = prepared.ok ? prepared.input : { ...body, topic: body.productName };

    if (action === "catch" && body.pack) {
      const pack = catchDetailPageFixes(body.pack, input);
      const usageAfter = await getUsageSummary(
        auth.supabase,
        auth.user.id,
        auth.user.email
      );
      return NextResponse.json(jsonPack(pack, { mode: "catch", usage: usageAfter }));
    }

    if (action === "improve" && body.pack) {
      const result = await improveDetailPagePack(
        body.pack,
        input,
        body.improveNote || body.note || ""
      );
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, userMessage: result.userMessage },
          { status: 400 }
        );
      }
      if (result.mode === "llm-edited") {
        await incrementContentUsage(auth.supabase, auth.user.id);
      }
      const usageAfter = await getUsageSummary(
        auth.supabase,
        auth.user.id,
        auth.user.email
      );
      return NextResponse.json(
        jsonPack(result.pack, { mode: result.mode, usage: usageAfter })
      );
    }

    const result = await generateDetailPagePack(input);
    const pack = result.pack;

    if (pack && result.mode === "llm") {
      await incrementContentUsage(auth.supabase, auth.user.id);
    }

    const usageAfter = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );

    return NextResponse.json(
      jsonPack(pack, {
        mode: result.mode,
        usageWarning: usageAfter.usageWarning,
        usage: usageAfter,
      })
    );
  } catch (err) {
    console.error("[api/content/detail-page]", err);
    await logError({
      userId: auth.user.id,
      route: "/api/content/detail-page",
      message: err.message,
      err,
      accessToken: auth.token,
    });
    const mapped = mapServiceError(err);
    return NextResponse.json(
      { ok: false, userMessage: mapped.userMessage },
      { status: mapped.status || 500 }
    );
  }
}
