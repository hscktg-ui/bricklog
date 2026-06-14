import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { getProductOverviewSnapshot } from "@/lib/admin/productOverviewSnapshot";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  return NextResponse.json({
    ok: true,
    snapshot: getProductOverviewSnapshot(),
  });
}
