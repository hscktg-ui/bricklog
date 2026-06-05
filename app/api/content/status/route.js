import { NextResponse } from "next/server";
import { getLlmServiceStatus } from "@/lib/llm/contentOrchestrator";
import { getOpenAIClientStatus } from "@/lib/llm/openaiSdk";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { useGeminiResearchProvider } from "@/lib/config/briclogFastPipeline";

export const runtime = "nodejs";

export async function GET() {
  const status = getLlmServiceStatus();
  const sdk = getOpenAIClientStatus();
  return NextResponse.json({
    ...status,
    geminiConfigured: isGeminiConfigured(),
    geminiResearchEnabled: useGeminiResearchProvider(),
    openaiSdk: {
      configured: sdk.configured,
      clientReady: sdk.clientReady,
      model: sdk.model,
    },
  });
}
