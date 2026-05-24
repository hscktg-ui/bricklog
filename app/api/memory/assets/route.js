import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { isMissingMemoryTable } from "@/lib/memory/server/memoryDb";
import { summarizeBrandAsset } from "@/lib/memory/server/assetSummary";
import { fetchUserPlan } from "@/lib/billing/usageLedger";
import { canUseBrandMemory } from "@/lib/billing/checkEntitlement";

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
      { ok: false, userMessage: "브랜드를 선택해 주세요." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await auth.supabase
      .from("brand_assets")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("brand_id", brandId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, assets: data || [] });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({ ok: true, assets: [], memoryReady: false });
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
    const { planId } = await fetchUserPlan(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );
    if (!canUseBrandMemory(planId)) {
      return NextResponse.json(
        {
          ok: false,
          userMessage:
            "브랜드 참고 자료 등록은 Pro 플랜에서 이용할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const text = String(body.extractedText || "").trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, userMessage: "자료 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    let summary = "";
    let keyPoints = [];
    let summaryPending = false;
    try {
      const sum = await summarizeBrandAsset(text, body.brandName);
      summary = sum.summary;
      keyPoints = sum.keyPoints;
    } catch {
      summaryPending = true;
    }

    const { data, error } = await auth.supabase
      .from("brand_assets")
      .insert({
        user_id: auth.user.id,
        brand_id: body.brandId,
        file_name: body.fileName || "자료.txt",
        file_type: body.fileType || "text",
        extracted_text: text.slice(0, 50000),
        summary,
        key_points: keyPoints,
      })
      .select()
      .single();
    if (error) throw error;

    if (summaryPending) {
      return NextResponse.json({
        ok: true,
        asset: data,
        userMessage: mapServiceError("asset_saved_summary_fail"),
        summaryPending: true,
      });
    }

    return NextResponse.json({ ok: true, asset: data });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "브랜드 자료 기능을 준비 중입니다. schema-v3-memory.sql을 실행해 주세요.",
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("upload_fail") },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const id = new URL(request.url).searchParams.get("id");
  try {
    const { error } = await auth.supabase
      .from("brand_assets")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}
