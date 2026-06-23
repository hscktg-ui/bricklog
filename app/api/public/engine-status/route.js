import { NextResponse } from "next/server";
import { getEngineOpsStatus } from "@/lib/brand/engineOpsStatus";

export const runtime = "nodejs";

const CACHE_MS = 30_000;
let cachedStatus = null;
let cachedAt = 0;

/** GET — 엔진·크론·메모리 DB 점검 (민감값 없음) */
export async function GET() {
  const fresh = cachedStatus && Date.now() - cachedAt < CACHE_MS;
  const status = fresh ? cachedStatus : await getEngineOpsStatus();
  if (!fresh) {
    cachedStatus = status;
    cachedAt = Date.now();
  }
  return NextResponse.json(status, {
    status: status.ok ? 200 : 503,
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
