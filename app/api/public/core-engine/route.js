import { NextResponse } from "next/server";
import {
  getCoreEngineInternationalProfile,
  getCoreEnginePublicProfile,
} from "@/lib/product/briclogCoreEngine";

export const runtime = "nodejs";

/** GET — 코어 엔진 공개 프로필 (민감 로직·프롬프트 없음) */
export async function GET(request) {
  const locale = new URL(request.url).searchParams.get("locale");
  const profile =
    locale === "en"
      ? getCoreEngineInternationalProfile()
      : getCoreEnginePublicProfile();
  return NextResponse.json({ ok: true, profile });
}
