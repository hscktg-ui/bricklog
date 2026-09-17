import { NextResponse } from "next/server";
import { getTrendCatalog } from "@/lib/trends/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const catalog = await getTrendCatalog();
  return NextResponse.json({
    ok: true,
    catalog,
  });
}
