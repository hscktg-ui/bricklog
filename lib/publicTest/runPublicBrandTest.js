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
import {
  buildInstantPublicTestPack,
  findMatchingPublicTestSample,
} from "@/lib/publicTest/publicTestInstantSample";
import { resolveIndustryFromFreeText } from "@/lib/simpleIndustry";
import { pickPublicTestTemplateForInput } from "@/lib/publicTest/pickPublicTestTemplate";

function inferPublicTestIndustry(rawInput = {}, sample = null) {
  if (sample?.industry) return sample.industry;
  if (rawInput.industry) return rawInput.industry;
  const haystack = [rawInput.topic, rawInput.brandName, rawInput.storeFeatures]
    .filter(Boolean)
    .join(" ");
  return resolveIndustryFromFreeText(haystack)?.industryLabel || undefined;
}

function buildPublicTestInput(sample, rawInput = {}) {
  const brandName = String(rawInput.brandName || sample?.brandName || "").trim();
  const region = String(rawInput.region || sample?.region || "").trim();
  const topic =
    String(rawInput.topic || sample?.topic || "").trim() ||
    String(rawInput.mainKeyword || "").trim();

  return enrichMinimalBlogInput({
    brandName,
    region,
    topic,
    mainKeyword: topic,
    industry: inferPublicTestIndustry(rawInput, sample),
    includePhrases: sample?.topicTrait || rawInput.includePhrases,
    blogLengthTier: "short",
    publicTestMode: true,
    v2AxisRequired: true,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
    betaTestGuardEnforced: true,
    skipAutoPipeline: true,
    directorBriefAddon:
      "【가입 전 샘플】허구 체험·반복·주제 복붙 없이, 브랜드·지역·주제에 맞는 짧고 구체적인 정보만.",
  });
}

export function tryInstantPublicTestSample(rawInput = {}) {
  const sample = findMatchingPublicTestSample(rawInput);
  if (!sample) return null;

  const base = buildPublicTestInput(sample, rawInput);
  const preWrite = prepareBriclogPreWriteContext(base);
  const input = {
    ...base,
    ...preWrite,
    contextLock: preWrite.contextLock,
    informationUnits: preWrite.informationUnits,
    knowledgeExpansionReady: preWrite.knowledgeExpansionReady,
    publicTestMode: true,
    sampleId: sample.id,
  };
  const pack = buildInstantPublicTestPack(sample);
  const gate = assertPublicTestSampleGate(input, pack);
  if (!gate.ok) return null;

  return {
    ok: true,
    withheld: false,
    preview: buildPublicTestPreview(pack),
    metrics: buildPublicTestMetrics(input, pack, gate),
    publishReady: true,
    instant: true,
  };
}

/** LLM·조사 실패 시 — 사용자 브랜드명으로 업종 맞춤 즉시 샘플 */
export function tryDynamicPublicTestInstant(rawInput = {}) {
  const template = pickPublicTestTemplateForInput(rawInput);
  if (!template) return null;

  const base = buildPublicTestInput(template, rawInput);
  const preWrite = prepareBriclogPreWriteContext(base);
  const input = {
    ...base,
    ...preWrite,
    contextLock: preWrite.contextLock,
    informationUnits: preWrite.informationUnits,
    knowledgeExpansionReady: preWrite.knowledgeExpansionReady,
    publicTestMode: true,
    templateId: template.id,
  };
  const pack = buildInstantPublicTestPack(template);
  const gate = assertPublicTestSampleGate(input, pack);
  if (!gate.ok) return null;

  return {
    ok: true,
    withheld: false,
    preview: buildPublicTestPreview(pack),
    metrics: buildPublicTestMetrics(input, pack, gate),
    publishReady: true,
    demoFallback: true,
    templateId: template.id,
  };
}

function failOrDemoFallback(rawInput, userMessage = PUBLIC_TEST_GATE_FAIL) {
  const demo = tryDynamicPublicTestInstant(rawInput);
  if (demo?.ok) return demo;
  return {
    ok: false,
    withheld: true,
    userMessage,
  };
}

async function generatePublicTestPack(input) {
  let result;
  try {
    result = await generateBlogWithLLMFirst(input);
  } catch {
    return {
      pack: null,
      gate: { ok: false, userMessage: PUBLIC_TEST_GATE_FAIL, reasons: ["llm_error"] },
    };
  }

  const pack = result?.blogContent;
  const gate = assertPublicTestSampleGate(input, pack);
  return { pack, gate };
}

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

  const instant = tryInstantPublicTestSample(rawInput);
  if (instant?.ok) return instant;

  const base = buildPublicTestInput(null, rawInput);

  const research = await applySignatureResearchServer(base, "blog");
  if (!research.ok) {
    return failOrDemoFallback(rawInput);
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

  const { pack, gate } = await generatePublicTestPack(input);
  if (!gate.ok) {
    return failOrDemoFallback(rawInput, gate.userMessage || PUBLIC_TEST_GATE_FAIL);
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
