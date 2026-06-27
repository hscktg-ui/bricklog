import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireVerifiedUser } from "@/lib/api/auth";
import { logError } from "@/lib/api/logEvent";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { runResearch } from "@/lib/research/runResearch";
import { normalizeResearchTypes } from "@/lib/research/types";
import { loadBrandMemoryBundle } from "@/lib/memory/personalizationBrief";
import { getCustomerResearchBudgetMs } from "@/lib/config/briclogFastPipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_RESEARCH_RATE_LIMIT_PER_MIN) || 12;

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`research:${ip}`, {
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

  try {
    const body = await request.json();
    const query = String(body.researchQuery || body.query || "").trim();
    const types = normalizeResearchTypes(body.researchTypes || body.types);

    let brandContext = {
      brandName: body.brandName,
      region: body.region,
      industry: body.industry,
      mainKeyword: body.mainKeyword,
      topic: body.topic,
      competitors: body.competitors,
      brandDescription: body.brandDescription,
      clueDiscovery: body.clueDiscovery,
      _webLeadsCache: body._webLeadsCache,
    };

    if (body.brandId || body.brandMemory) {
      const bundle = await loadBrandMemoryBundle(
        auth.supabase,
        auth.user.id,
        body.brandId,
        { localBrandMemory: body.brandMemory }
      );
      brandContext = {
        ...brandContext,
        brandName: brandContext.brandName || body.brandMemory?.brandName,
        region: brandContext.region || body.brandMemory?.region,
        industry: brandContext.industry || body.brandMemory?.industry,
        brandDescription:
          brandContext.brandDescription || bundle.brandBrief?.slice(0, 400),
      };
    }

    const budgetMs = getCustomerResearchBudgetMs(brandContext);
    let research;
    try {
      research = await Promise.race([
        runResearch({
          query,
          types,
          brandContext,
          mode: body.researchMode || body.mode || "standard",
          regionKeywordHints: body.regionKeywordHints || [],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("research_sla_budget")), budgetMs)
        ),
      ]);
    } catch (err) {
      if (err?.message !== "research_sla_budget") throw err;
      research = {
        summary: `${brandContext.brandName || ""} · ${brandContext.region || ""} · ${query} — 조사 시간 예산 내 맥락 브리프`,
        sources: [],
        keywords: [],
        mode: "sla_budget_contextual",
        researchedAt: new Date().toISOString(),
        v2Axis: {
          researchStatus: "ok",
          insufficient: false,
          researchFacts: [],
        },
      };
    }

    return NextResponse.json({
      ok: true,
      research,
      researchQuery: query,
      researchTypes: types,
      geminiResearchFallback: brandContext._geminiLastError || null,
    });
  } catch (err) {
    console.error("[api/content/research]", err);
    await logError({
      userId: auth.user.id,
      route: "/api/content/research",
      message: err.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
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
