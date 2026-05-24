import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { isMissingMemoryTable } from "@/lib/memory/server/memoryDb";

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
  try {
    let q = auth.supabase
      .from("brand_competitors")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    if (brandId) q = q.eq("brand_id", brandId);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, competitors: data || [] });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({ ok: true, competitors: [], memoryReady: false });
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
    const { data, error } = await auth.supabase
      .from("brand_competitors")
      .insert({
        user_id: auth.user.id,
        brand_id: body.brandId,
        competitor_name: body.competitorName || "",
        website_url: body.websiteUrl || "",
        memo: body.memo || "",
        observed_keywords: body.observedKeywords || "",
        content_style: body.contentStyle || "",
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, competitor: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    const { data, error } = await auth.supabase
      .from("brand_competitors")
      .update({
        competitor_name: body.competitorName,
        website_url: body.websiteUrl,
        memo: body.memo,
        observed_keywords: body.observedKeywords,
        content_style: body.contentStyle,
      })
      .eq("id", body.id)
      .eq("user_id", auth.user.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, competitor: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
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
      .from("brand_competitors")
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
