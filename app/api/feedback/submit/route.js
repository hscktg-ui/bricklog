import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  upsertContentFeedback,
  isMissingFeedbackTable,
} from "@/lib/feedback/server/feedback";
import { recomputeBrandLearningProfile } from "@/lib/feedback/brandLearningProfile";
import { refreshPersonalizationAfterContent } from "@/lib/memory/personalizationBrief";
import { recordFeedbackAsset } from "@/lib/dataAsset/recordFeedbackAsset";
import { runFeedbackEngineLoop } from "@/lib/feedback/feedbackEngineLoop";
import { normalizeFeedbackIntents } from "@/lib/feedback/feedbackIntentEngine";

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

    const intents = normalizeFeedbackIntents(body.intents);
    const feedback = await upsertContentFeedback(auth.supabase, auth.user.id, {
      ...body,
      intents,
    });

    let events = [];
    try {
      const { data: ev } = await auth.supabase
        .from("content_events")
        .select("event_type, meta, created_at")
        .eq("content_item_id", body.contentItemId)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(24);
      events = ev || [];
    } catch {
      events = [];
    }

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

    let engineLoop = null;
    try {
      engineLoop = await runFeedbackEngineLoop(feedback, events);
    } catch {
      /* 전역 엔진 반영 실패해도 피드백 저장은 유지 */
    }

    return NextResponse.json({ ok: true, feedback, profile, engineLoop });
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
