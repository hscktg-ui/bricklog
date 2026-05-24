import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import { stopTrainingRun } from "@/lib/quality/training/runner";

export const runtime = "nodejs";

export async function POST(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const body = await request.json().catch(() => ({}));
  const result = await stopTrainingRun(body.runId);
  return NextResponse.json({
    ok: result.ok,
    runId: result.runId,
    userMessage: result.ok
      ? "중단 요청을 보냈습니다."
      : result.message || "진행 중인 테스트가 없습니다.",
  });
}
