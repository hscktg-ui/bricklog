import { NextResponse } from "next/server";
import { getEngineOpsStatus } from "@/lib/brand/engineOpsStatus";

export const runtime = "nodejs";

const CACHE_MS = 30_000;
let cachedStatus = null;
let cachedAt = 0;
let lastKnownGood = null;

/** GET — 엔진·크론·메모리 DB 점검 (민감값 없음) */
export async function GET() {
  const fresh = cachedStatus && Date.now() - cachedAt < CACHE_MS;
  let status = fresh ? cachedStatus : await getEngineOpsStatus();
  if (!fresh) {
    if (status.ok) lastKnownGood = status;
    else if (lastKnownGood) {
      status = {
        ...lastKnownGood,
        ok: true,
        stale: true,
        staleAt: new Date().toISOString(),
        notes: [
          ...(lastKnownGood.notes || []),
          "일시적 DB 점검 실패 — 마지막 정상 스냅샷을 제공합니다.",
        ],
      };
    }
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
