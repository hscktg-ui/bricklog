import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";
import { applySignatureResearchServer } from "@/lib/content/applySignatureResearchServer";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { assertPublicTestSampleGate } from "@/lib/publicTest/publicTestGate";
import { buildPublicTestPreview } from "@/lib/publicTest/buildPublicTestPreview";
import { buildPublicTestMetrics } from "@/lib/publicTest/publicTestMetrics";
import {
  PUBLIC_TEST_GATE_FAIL,
} from "@/lib/publicTest/publicTestConfig";

/**
 * 가입 전 브랜드 테스트 — 검수 미통과 시 본문 미노출 (옵션 2)
 */
export async function runPublicBrandTest(rawInput = {}) {
  const brandName = String(rawInput.brandName || "").trim();
  const region = String(rawInput.region || "").trim();
  const topic =
    String(rawInput.topic || "").trim() ||
    String(rawInput.mainKeyword || "").trim();

  if (!brandName || !region || !topic) {
    return {
      ok: false,
      withheld: true,
      userMessage: "브랜드 · 지역 · 오늘의 주제를 모두 입력해 주세요.",
    };
  }

  const base = enrichMinimalBlogInput({
    brandName,
    region,
    topic,
    mainKeyword: topic,
    blogLengthTier: "short",
    publicTestMode: true,
    v2AxisRequired: true,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
    betaTestGuardEnforced: true,
    skipAutoPipeline: true,
  });

  const research = await applySignatureResearchServer(base, "blog");
  if (!research.ok) {
    return {
      ok: false,
      withheld: true,
      userMessage: PUBLIC_TEST_GATE_FAIL,
    };
  }

  const preWrite = prepareBriclogPreWriteContext(research.input);
  const input = {
    ...research.input,
    ...preWrite,
    contextLock: preWrite.contextLock,
    informationUnits: preWrite.informationUnits,
    knowledgeExpansionReady: preWrite.knowledgeExpansionReady,
    v2ResearchReady: true,
    v2PreWriteVerified: true,
    v2AxisVerified: true,
    v2PipelineStage: "information_research_verified",
    publicTestMode: true,
    blogLengthTier: "short",
    skipAutoPipeline: true,
  };

  let result;
  try {
    result = await generateBlogWithLLMFirst(input);
  } catch {
    return {
      ok: false,
      withheld: true,
      userMessage: PUBLIC_TEST_GATE_FAIL,
    };
  }

  const pack = result?.blogContent;
  const gate = assertPublicTestSampleGate(input, pack);
  if (!gate.ok) {
    return {
      ok: false,
      withheld: true,
      userMessage: gate.userMessage || PUBLIC_TEST_GATE_FAIL,
    };
  }

  const preview = buildPublicTestPreview(pack);
  const metrics = buildPublicTestMetrics(input, pack, gate);

  return {
    ok: true,
    withheld: false,
    preview,
    metrics,
    publishReady:
      pack._meta?.publishReady === true ||
      pack._meta?.aiEditorAudit?.publishReady === true,
  };
}
