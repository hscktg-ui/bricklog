import { NextResponse } from "next/server";
import { getEngineOpsStatus } from "@/lib/brand/engineOpsStatus";

export const runtime = "nodejs";

/** GET — 엔진·크론·메모리 DB 점검 (민감값 없음) */
export async function GET() {
  const status = await getEngineOpsStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
