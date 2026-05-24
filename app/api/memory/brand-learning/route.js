import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  getBrandLearningBrief,
  recomputeBrandLearningProfile,
  brandLearningProfileForUI,
} from "@/lib/feedback/brandLearningProfile";
import { isMissingFeedbackTable } from "@/lib/feedback/db";
import { getBrandAssetSummary } from "@/lib/dataAsset/getBrandAssetSummary";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const brandId = new URL(request.url).searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json(
      { ok: false, userMessage: "brandId가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const { data } = await auth.supabase
      .from("brand_learning_profiles")
      .select("profile, updated_at")
      .eq("brand_id", brandId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const [brief, assetSummary] = await Promise.all([
      getBrandLearningBrief(brandId, auth.supabase, auth.user.id),
      getBrandAssetSummary(auth.supabase, auth.user.id, brandId),
    ]);

    return NextResponse.json({
      ok: true,
      profile: brandLearningProfileForUI(data?.profile),
      brief,
      assetCounts: assetSummary.counts,
      continuityCopy: assetSummary.continuityCopy,
      updatedAt: data?.updated_at || null,
      feedbackTablesReady: true,
    });
  } catch (err) {
    if (isMissingFeedbackTable(err)) {
      return NextResponse.json({
        ok: true,
        profile: null,
        brief: "",
        feedbackTablesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "브랜드 학습 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const brandId = new URL(request.url).searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json(
      { ok: false, userMessage: "brandId가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const row = await recomputeBrandLearningProfile(
      auth.supabase,
      auth.user.id,
      brandId
    );
    return NextResponse.json({
      ok: true,
      profile: brandLearningProfileForUI(row?.profile),
      updatedAt: row?.updated_at || null,
    });
  } catch (err) {
    if (isMissingFeedbackTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "schema-v6-feedback-learning.sql을 Supabase에 적용해 주세요.",
        feedbackTablesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "브랜드 학습 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
