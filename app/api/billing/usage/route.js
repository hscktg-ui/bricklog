import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { getUsageSummary } from "@/lib/billing/usageLedger";

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
    const usage = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );
    return NextResponse.json({ ok: true, usage });
  } catch (err) {
    console.error("[billing/usage]", err);
    return NextResponse.json(
      {
        ok: false,
        userMessage: "사용량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
