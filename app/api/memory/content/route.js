import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import {
  isMissingMemoryTable,
  isMissingMemoryColumn,
  listContentItems,
  upsertContentItem,
} from "@/lib/memory/server/memoryDb";
import { refreshPersonalizationAfterContent } from "@/lib/memory/personalizationBrief";
import { recordGenerationAsset } from "@/lib/dataAsset/recordGenerationAsset";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { searchParams } = new URL(request.url);
  try {
    const items = await listContentItems(auth.supabase, auth.user.id, {
      brandId: searchParams.get("brandId") || undefined,
      channel: searchParams.get("channel") || undefined,
    });
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({ ok: true, items: [], memoryReady: false });
    }
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_load") },
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

  try {
    const body = await request.json();
    let item;
    try {
      item = await upsertContentItem(auth.supabase, auth.user.id, body);
    } catch (err) {
      if (
        isMissingMemoryColumn(err) &&
        (body.researchQuery != null || body.researchResult != null)
      ) {
        const { researchQuery, researchResult, researchDate, researchSource, ...rest } =
          body;
        item = await upsertContentItem(auth.supabase, auth.user.id, rest);
      } else {
        throw err;
      }
    }
    if (body.brandId) {
      recordGenerationAsset(auth.supabase, auth.user.id, {
        brandId: body.brandId,
        contentItemId: item?.id,
        channel: body.channel || item?.channel || "blog",
        qualityScore: body.qualityScore ?? item?.quality_score,
        persona: body.persona || item?.persona,
        emotionTone: body.emotionTone || item?.emotion_tone,
        meta: {
          versionSource: body.versionSource,
          rewriteCount: body.promptInput?.generation_log?.rewrite_count,
        },
      }).catch(() => null);
      refreshPersonalizationAfterContent(
        auth.supabase,
        auth.user.id,
        body.brandId
      ).catch(() => null);
    }
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({
        ok: true,
        item: null,
        skipped: true,
        memoryReady: false,
        userMessage:
          "상세 기록은 아직 연결되지 않았습니다. 초안은 브랜드에 자동으로 쌓입니다.",
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}
