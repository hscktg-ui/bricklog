import { NextResponse } from "next/server";
import { generateChannelImage, getImageProviderStatus } from "@/lib/imageGeneration";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { checkImageGeneration } from "@/lib/billing/checkEntitlement";
import {
  incrementImageUsage,
  getUsageSummary,
} from "@/lib/billing/usageLedger";
import { loadBrandKnowledgeBrief } from "@/lib/memory/server/brandKnowledge";
import {
  buildMarketingImagePrompt,
  pickPromptFromPack,
} from "@/lib/images/buildMarketingPrompt";
import { resolveRatio, getImageType } from "@/lib/images/imageTypes";
import {
  assertDevFreezeAllowed,
  DEV_FREEZE_FEATURES,
} from "@/lib/config/devFreeze";

export const runtime = "nodejs";

const MAX_PER_MIN =
  Number(process.env.BRICLOG_IMAGE_RATE_LIMIT_PER_MIN) || 6;

export async function POST(request) {
  const frozen = assertDevFreezeAllowed(DEV_FREEZE_FEATURES.image);
  if (!frozen.ok) {
    return NextResponse.json(
      { ok: false, userMessage: frozen.userMessage, code: "dev_freeze" },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`image:${ip}`, {
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

  const entitlement = await checkImageGeneration(
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
    const {
      prompt: manualPrompt,
      imagePack,
      type = "blog_thumbnail",
      ratio = "auto",
      industry = "",
      brandId,
      blogTitle = "",
      blogExcerpt = "",
      brandName = "",
      brandColors = [],
      slogan = "",
      variant = "default",
      provider = "auto",
    } = body || {};

    const resolvedRatio = resolveRatio(type, ratio);
    const baseFromPack = pickPromptFromPack(imagePack, type);

    let brandMeta = { colors: brandColors, slogan };
    if (brandId) {
      const { data: brand } = await auth.supabase
        .from("brands")
        .select("brand_name, industry, metadata")
        .eq("id", brandId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (brand) {
        brandMeta.brandName = brand.brand_name || brandName;
        brandMeta.industry = brand.industry || industry;
        const meta = brand.metadata || {};
        if (meta.brandColors) brandMeta.colors = meta.brandColors;
        if (meta.slogan) brandMeta.slogan = meta.slogan;
      }
      await loadBrandKnowledgeBrief(auth.supabase, auth.user.id, brandId);
    }

    const prompt =
      manualPrompt?.trim() ||
      buildMarketingImagePrompt({
        type,
        ratio: resolvedRatio,
        industry: brandMeta.industry || industry,
        blogTitle,
        blogExcerpt,
        brandName: brandMeta.brandName || brandName,
        brandColors: brandMeta.colors || brandColors,
        slogan: brandMeta.slogan || slogan,
        basePrompt: baseFromPack,
        variant,
      });

    if (!prompt?.trim()) {
      return NextResponse.json(
        { ok: false, userMessage: "이미지 프롬프트를 만들 수 없습니다. 블로그를 먼저 생성해 주세요." },
        { status: 400 }
      );
    }

    const status = getImageProviderStatus();
    if (!status.any && provider === "auto") {
      return NextResponse.json(
        {
          ok: false,
          userMessage: "이미지 생성 서비스를 준비 중입니다. 잠시 후 다시 시도해 주세요.",
          usageWarning: entitlement.usageWarning,
        },
        { status: 503 }
      );
    }

    const result = await generateChannelImage(prompt, {
      ratio: resolvedRatio,
      provider,
    });

    await incrementImageUsage(auth.supabase, auth.user.id);
    const usage = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );

    return NextResponse.json({
      ok: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      model: result.model,
      revisedPrompt: result.revisedPrompt,
      type,
      typeLabel: getImageType(type).label,
      ratio: resolvedRatio,
      usageWarning: usage.usageWarning,
      usage,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: err.message || "이미지 생성에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getImageProviderStatus();
  return NextResponse.json({ providers: status });
}
