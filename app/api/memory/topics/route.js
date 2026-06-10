import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { buildTopicRecommendations } from "@/lib/memory/topicEngine";
import { isMissingMemoryTable } from "@/lib/memory/server/memoryDb";
import { fetchUserPlan } from "@/lib/billing/usageLedger";
import { getPlanDefinition } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { planId } = await fetchUserPlan(
    auth.supabase,
    auth.user.id,
    auth.user.email
  );
  const plan = getPlanDefinition(planId);
  if (!plan.topicRecommendations) {
    return NextResponse.json({
      ok: true,
      topics: [],
      userMessage:
        "주제 추천은 하이엔드(스튜디오) 플랜에서 제공됩니다. 플러스(프리미엄)에서는 저장·톤 학습을 이용할 수 있습니다.",
    });
  }

  const brandId = new URL(request.url).searchParams.get("brandId");

  let brand = {};
  let recentTopics = [];
  let performancePatterns = [];
  const channelsUsed = { blog: false, place: false, instagram: false };

  try {
    if (brandId) {
      const { data: b } = await auth.supabase
        .from("brands")
        .select("brand_name, industry, region, metadata")
        .eq("id", brandId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (b) {
        const meta = b.metadata && typeof b.metadata === "object" ? b.metadata : {};
        brand = {
          brandName: b.brand_name,
          industry: b.industry,
          region: b.region,
          storeFeatures: meta.storeFeatures || meta.brandDescription || "",
          brandDescription: meta.brandDescription || "",
          includePhrases: meta.includePhrases || "",
          services: meta.services || "",
          preferredKeywords: meta.preferredKeywords || meta.mainKeyword || "",
        };
      }

      const { data: items } = await auth.supabase
        .from("content_items")
        .select("title, channel")
        .eq("brand_id", brandId)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const it of items || []) {
        recentTopics.push(it.title);
        if (it.channel === "blog") channelsUsed.blog = true;
        if (it.channel === "place") channelsUsed.place = true;
        if (it.channel === "instagram") channelsUsed.instagram = true;
      }

      const { data: perf } = await auth.supabase
        .from("content_performance")
        .select("patterns, reaction")
        .eq("user_id", auth.user.id);
      for (const p of perf || []) {
        if (p.reaction === "good" && p.patterns?.length) {
          performancePatterns.push(...p.patterns);
        }
      }
    }
  } catch (err) {
    if (!isMissingMemoryTable(err)) {
      /* ignore partial */
    }
  }

  const topics = buildTopicRecommendations({
    ...brand,
    recentTopics,
    performancePatterns,
    channelsUsed,
  });

  return NextResponse.json({ ok: true, topics });
}
