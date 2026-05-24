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

  try {
    const { data, error } = await auth.supabase
      .from("user_templates")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, templates: data || [] });
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      return NextResponse.json({ ok: true, templates: [], memoryReady: false });
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
      .from("user_templates")
      .insert({
        user_id: auth.user.id,
        template_name: body.templateName || "내 템플릿",
        persona: body.persona || "auto",
        emotion_tone: body.emotionTone || "auto",
        channel: body.channel || "blog",
        length_preference: body.lengthPreference || "medium",
        forbidden_words: body.forbiddenWords || "",
        preferred_style: body.preferredStyle || "",
        payload: body.payload || {},
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, template: data });
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
      .from("user_templates")
      .update({
        template_name: body.templateName,
        persona: body.persona,
        emotion_tone: body.emotionTone,
        channel: body.channel,
        length_preference: body.lengthPreference,
        forbidden_words: body.forbiddenWords,
        preferred_style: body.preferredStyle,
        payload: body.payload,
      })
      .eq("id", body.id)
      .eq("user_id", auth.user.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, template: data });
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  try {
    const { error } = await auth.supabase
      .from("user_templates")
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
