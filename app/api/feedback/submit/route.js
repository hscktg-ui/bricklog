import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  upsertContentFeedback,
  isMissingFeedbackTable,
} from "@/lib/feedback/server/feedback";
import { recomputeBrandLearningProfile } from "@/lib/feedback/brandLearningProfile";
import { refreshPersonalizationAfterContent } from "@/lib/memory/personalizationBrief";
import { recordFeedbackAsset } from "@/lib/dataAsset/recordFeedbackAsset";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    if (!body.contentItemId) {
      return NextResponse.json(
        { ok: false, userMessage: "콘텐츠 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const feedback = await upsertContentFeedback(
      auth.supabase,
      auth.user.id,
      body
    );

    let profile = null;
    if (feedback.brand_id) {
      await recordFeedbackAsset(auth.supabase, auth.user.id, {
        brandId: feedback.brand_id,
        contentItemId: feedback.content_item_id,
        channel: feedback.channel,
        reaction: feedback.reaction,
        tags: feedback.tags,
      }).catch(() => null);
      profile = await recomputeBrandLearningProfile(
        auth.supabase,
        auth.user.id,
        feedback.brand_id
      );
      await refreshPersonalizationAfterContent(
        auth.supabase,
        auth.user.id,
        feedback.brand_id
      ).catch(() => null);
    }

    return NextResponse.json({ ok: true, feedback, profile });
  } catch (err) {
    if (isMissingFeedbackTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "피드백 기능을 준비 중입니다. Supabase에서 schema-v6-feedback-learning.sql을 실행해 주세요.",
        memoryReady: false,
      });
    }
    if (err.message === "invalid_reaction") {
      return NextResponse.json(
        { ok: false, userMessage: "반응 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, userMessage: "피드백 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
