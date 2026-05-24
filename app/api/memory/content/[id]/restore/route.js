import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { addContentVersion } from "@/lib/memory/server/memoryDb";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const contentItemId = (await params).id;
  try {
    const { versionId } = await request.json();
    const { data: ver, error: verErr } = await auth.supabase
      .from("content_versions")
      .select("*")
      .eq("id", versionId)
      .eq("content_item_id", contentItemId)
      .eq("user_id", auth.user.id)
      .single();
    if (verErr) throw verErr;

    const { data: item, error } = await auth.supabase
      .from("content_items")
      .update({
        title: ver.title,
        full_content: ver.full_content,
      })
      .eq("id", contentItemId)
      .eq("user_id", auth.user.id)
      .select()
      .single();
    if (error) throw error;

    await addContentVersion(auth.supabase, auth.user.id, {
      contentItemId,
      source: "restore",
      title: item.title,
      fullContent: item.full_content,
    });

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}
