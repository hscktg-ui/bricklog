import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { patchToRow, rowToBrand } from "@/lib/brands/brandMapper";
import { logError } from "@/lib/api/logEvent";
import { mapSupabaseUserMessage } from "@/lib/api/supabaseErrors";

export const runtime = "nodejs";

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
    const patch = patchToRow(body);
    if (body.metadata) patch.metadata = body.metadata;

    const { data, error } = await auth.supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, brand: rowToBrand(data) });
  } catch (err) {
    await logError({
      userId: auth.user.id,
      route: "/api/brands PATCH",
      message: err.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        userMessage: mapSupabaseUserMessage(
          err,
          "브랜드를 수정하지 못했습니다."
        ),
      },
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
  const { error } = await auth.supabase
    .from("brands")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    await logError({
      userId: auth.user.id,
      route: "/api/brands DELETE",
      message: error.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        userMessage: mapSupabaseUserMessage(
          error,
          "브랜드를 삭제하지 못했습니다."
        ),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    userMessage: "브랜드가 삭제되었습니다. 이전 초안 기록은 그대로 남습니다.",
  });
}
