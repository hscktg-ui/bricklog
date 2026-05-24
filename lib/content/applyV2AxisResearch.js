import {
  buildBrandAxisBrief,
  buildRegionAxisBrief,
  buildV2AxisResearchQuery,
  parseV2AxisResearch,
} from "@/lib/content/v2AxisResearch";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import { buildResearchBrief, serializeResearchForStorage } from "@/lib/research/buildResearchBrief";
import { defaultAutoResearchTypes } from "@/lib/research/needsOnlineResearch";
import { verifyPreWriteResearch } from "@/lib/content/v2PipelineGate";
import { runV3PreWriteEnrichment } from "@/lib/content/v3/pipeline";
import { runResearchDepthCascade } from "@/lib/content/researchDepthEngine";
import { runResearch } from "@/lib/research/runResearch";

/**
 * 브랜드 → 지역 → 주제 + RESEARCH DEPTH 연쇄 조사
 */
export async function applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync,
  setResearchResult,
  onStep,
}) {
  const input = pipelineInput;
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();

  if (!brand || !region || !topic) {
    return {
      ok: false,
      insufficient: true,
      userMessage: "브랜드 · 지역 · 주제 세 가지를 모두 입력해 주세요.",
    };
  }

  onStep?.("브랜드 분석 중…");
  const brandResearch = runBrandResearchEngine(input);
  const brandBrief = buildBrandAxisBrief(input, brandResearch);

  onStep?.("제품 조사 중…");
  const query = buildV2AxisResearchQuery(input);
  const types = defaultAutoResearchTypes(input);
  const regionHints = buildRegionKeywordHints(input);

  let research = null;
  try {
    const researchRes = await generateResearchAsync({
      ...input,
      researchQuery: query,
      researchTypes: types,
      researchMode: "v2_axis",
      regionKeywordHints: regionHints,
      topic,
    });
    research = researchRes?.research;
  } catch {
    research = null;
  }

  onStep?.("관련 정보 탐색 중…");
  const depthRun = await runResearchDepthCascade({
    input,
    types,
    regionKeywordHints: regionHints,
    primaryResearch: research,
    brandResearch,
    onStage: onStep,
    runResearch,
  });

  research = depthRun.research;

  const parsed = parseV2AxisResearch(research, input, brandResearch, {
    facts: depthRun.facts,
    depth: depthRun.depth,
  });

  if (!parsed.ok) {
    return {
      ok: false,
      insufficient: true,
      userMessage:
        "브랜드 · 지역 · 주제를 입력해 주세요.",
      gaps: parsed.gaps,
    };
  }

  onStep?.("조사 검증 중…");
  const preWriteVerification = verifyPreWriteResearch(parsed, research);
  if (!preWriteVerification.ok) {
    return {
      ok: false,
      insufficient: true,
      userMessage: "조사·검증 단계를 마무리하지 못했습니다.",
      gaps: parsed.gaps,
      preWriteVerification,
    };
  }

  const v3 = runV3PreWriteEnrichment({
    input,
    brandResearch,
    parsed,
    research,
    regionHints,
    onStep,
  });
  if (!v3.ok) {
    return {
      ok: false,
      insufficient: true,
      userMessage: v3.userMessage || "전략·검증 단계를 마무리하지 못했습니다.",
      verification: v3.verification,
    };
  }

  const regionBrief = buildRegionAxisBrief(input);
  const combinedBrief = [
    brandBrief,
    regionBrief,
    v3.v3MasterBrief,
    parsed.brief,
    buildResearchBrief(research, { query, types }),
  ]
    .filter(Boolean)
    .join("\n\n");

  setResearchResult?.(research);
  pipelineInput.researchBrief = combinedBrief;
  pipelineInput.v2AxisBrief = combinedBrief;
  pipelineInput.v2ProductName = parsed.productName;
  pipelineInput.regionKeywordHints = regionHints;
  pipelineInput.researchFacts = parsed.facts;
  pipelineInput.researchFactCount = parsed.factCount;
  pipelineInput.factsPrompt = parsed.factsPrompt;
  pipelineInput.researchDepthTier = parsed.depthTier;
  pipelineInput.v2ResearchReady = true;
  pipelineInput.v2PreWriteVerified = true;
  pipelineInput.v2PreWriteVerification = preWriteVerification;
  pipelineInput.v2PipelineStage = "research_verified";
  pipelineInput.v2PipelineEnforced = true;
  pipelineInput.v3EngineEnforced = true;
  pipelineInput.v2AxisRequired = true;
  pipelineInput.v3PreWriteVerified = true;
  pipelineInput.v3MasterBrief = v3.v3MasterBrief;
  pipelineInput.v3ContentStrategy = v3.strategy;
  pipelineInput.v3SeoStrategy = v3.seoStrategy;
  pipelineInput.v3BrandAnalysis = v3.brandAnalysis;
  pipelineInput.v3RegionAnalysis = v3.regionAnalysis;
  pipelineInput.v3TopicAnalysis = v3.topicAnalysis;
  pipelineInput.v3Verification = v3.verification;
  const storage = serializeResearchForStorage(query, research, types);
  pipelineInput.researchPayload = storage;

  return {
    ok: true,
    insufficient: false,
    brief: combinedBrief,
    storage,
    productName: parsed.productName,
    factCount: parsed.factCount,
    facts: parsed.facts,
    depthTier: parsed.depthTier,
  };
}
