import { NextResponse } from "next/server";
import { getLlmServiceStatus } from "@/lib/llm/contentOrchestrator";
import { getOpenAIClientStatus } from "@/lib/llm/openaiSdk";

export const runtime = "nodejs";

export async function GET() {
  const status = getLlmServiceStatus();
  const sdk = getOpenAIClientStatus();
  return NextResponse.json({
    ...status,
    openaiSdk: {
      configured: sdk.configured,
      clientReady: sdk.clientReady,
      model: sdk.model,
    },
  });
}
