import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import { brandToRow, rowToBrand } from "@/lib/brands/brandMapper";
import { logError } from "@/lib/api/logEvent";
import { mapSupabaseUserMessage, isMissingBrandsTable } from "@/lib/api/supabaseErrors";
import { checkBrandCreate } from "@/lib/billing/checkEntitlement";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireVerifiedUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message, code: auth.error.code },
      { status: auth.error.status }
    );
  }

  const { data, error } = await auth.supabase
    .from("brands")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    await logError({
      userId: auth.user.id,
      route: "/api/brands",
      message: error.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        userMessage: mapSupabaseUserMessage(
          error,
          "브랜드 목록을 불러오지 못했습니다."
        ),
        missingTable: isMissingBrandsTable(error),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    brands: (data || []).map(rowToBrand),
  });
}

export async function POST(request) {
  const auth = await requireVerifiedUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const { count } = await auth.supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id);

    const brandCheck = await checkBrandCreate(
      auth.supabase,
      auth.user.id,
      count ?? 0,
      auth.user.email
    );
    if (!brandCheck.ok) {
      return NextResponse.json(
        { ok: false, userMessage: brandCheck.userMessage },
        { status: 403 }
      );
    }

    const body = await request.json();
    const row = brandToRow(body, auth.user.id);
    const { data, error } = await auth.supabase
      .from("brands")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, brand: rowToBrand(data) });
  } catch (err) {
    await logError({
      userId: auth.user.id,
      route: "/api/brands POST",
      message: err.message,
      accessToken: auth.token,
    });
    return NextResponse.json(
      {
        ok: false,
        code: err.code,
        userMessage: mapSupabaseUserMessage(
          err,
          "브랜드를 저장하지 못했습니다."
        ),
        missingTable: isMissingBrandsTable(err),
      },
      { status: 500 }
    );
  }
}
