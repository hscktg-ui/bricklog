import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import {
  addContentVersion,
  isMissingMemoryTable,
} from "@/lib/memory/server/memoryDb";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const id = (await params).id;
  try {
    const { data: item, error } = await auth.supabase
      .from("content_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single();
    if (error) throw error;

    const { data: versions } = await auth.supabase
      .from("content_versions")
      .select("id, version_number, source, title, created_at")
      .eq("content_item_id", id)
      .order("version_number", { ascending: false });

    return NextResponse.json({ ok: true, item, versions: versions || [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_load") },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const id = (await params).id;
  try {
    const body = await request.json();
    const patch = {
      title: body.title,
      full_content: body.fullContent,
      hashtags: body.hashtags,
      updated_at: new Date().toISOString(),
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    const { data, error } = await auth.supabase
      .from("content_items")
      .update(patch)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();
    if (error) throw error;

    if (body.fullContent) {
      await addContentVersion(auth.supabase, auth.user.id, {
        contentItemId: id,
        source: body.versionSource || "user_edit",
        title: data.title,
        fullContent: data.full_content,
      });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: mapServiceError("db_save") },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const id = (await params).id;
  try {
    const { error } = await auth.supabase
      .from("content_items")
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
