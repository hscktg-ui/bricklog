import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  countContentItems,
  isMissingMemoryTable,
} from "@/lib/memory/server/memoryDb";
import { shouldShowBrandWarehouse } from "@/lib/dashboard/workspaceMaturity";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  let contentLogCount = 0;
  let memoryReady = true;

  try {
    contentLogCount = await countContentItems(auth.supabase, auth.user.id);
  } catch (err) {
    if (isMissingMemoryTable(err)) {
      memoryReady = false;
    } else {
      return NextResponse.json(
        { ok: false, userMessage: "기록 수를 불러오지 못했습니다." },
        { status: 500 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const brandCount = Math.max(0, Number(searchParams.get("brandCount")) || 0);

  return NextResponse.json({
    ok: true,
    contentLogCount,
    memoryReady,
    showBrandWarehouse: shouldShowBrandWarehouse(contentLogCount, {
      brandCount,
    }),
  });
}
