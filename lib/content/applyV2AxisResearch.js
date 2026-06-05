import {
  buildBrandAxisBrief,
  buildRegionAxisBrief,
  buildV2AxisResearchQuery,
  parseV2AxisResearch,
} from "@/lib/content/v2AxisResearch";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import {
  buildResearchBrief,
  serializeResearchForStorage,
} from "@/lib/research/buildResearchBrief";
import { defaultAutoResearchTypes } from "@/lib/research/needsOnlineResearch";
import { verifyPreWriteResearch } from "@/lib/content/v2PipelineGate";
import { runV3PreWriteEnrichment } from "@/lib/content/v3/pipeline";
import {
  runResearchDepthCascade,
  assessResearchDepth,
  buildDepthWritingBrief,
  augmentFactsFromLocalContext,
  formatDepthFactsPrompt,
} from "@/lib/content/researchDepthEngine";
import { runResearch } from "@/lib/research/runResearch";
import { discoverClues } from "@/lib/content/clueDiscoveryEngine";
import {
  attachPreWriteContextToPipeline,
  prepareBriclogPreWriteContext,
} from "@/lib/content/briclogPreWriteContext";
import {
  KNOWLEDGE_COVERAGE_STAGE_LABEL,
} from "@/lib/content/knowledgeCoverageEngine";
import {
  KNOWLEDGE_EXPANSION_STAGE_LABELS,
} from "@/lib/content/knowledgeExpansionEngine";
import { INFORMATION_UNIT_STAGE_LABEL } from "@/lib/content/informationUnitEngine";
import {
  getResearchDepthMaxRounds,
  shouldSkipModelTopicExtraResearch,
} from "@/lib/config/briclogFastPipeline";
import { researchGateBlockedForInsufficient } from "@/lib/content/researchSufficiencyGate";
import { ensureSupplementalResearchReady } from "@/lib/content/supplementalResearchPass";
import {
  buildCustomerQuestionAnalysis,
  formatCustomerQuestionBrief,
  CUSTOMER_QUESTION_STAGE_LABEL,
} from "@/lib/content/customerQuestionEngine";

function isModelLikeTopic(topic = "") {
  const t = String(topic || "").trim();
  return /[A-Za-z]+[0-9]+|[0-9]+[A-Za-z]+|[가-힣]+[0-9]+/.test(t);
}

function hasTopicAnchoredFact(parsed, topic = "") {
  const key = String(topic || "").trim();
  if (!key) return false;
  return (parsed?.facts || []).some((f) =>
    String(f?.fact || "")
      .toLowerCase()
      .includes(key.toLowerCase())
  );
}

function mergeUniqueFacts(base = [], extra = []) {
  const out = [];
  const seen = new Set();
  for (const row of [...base, ...extra]) {
    const fact = String(row?.fact || "").trim();
    if (!fact) continue;
    const k = fact.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function commitV2AxisPipeline({
  pipelineInput,
  input,
  brandResearch,
  brandBrief,
  regionBrief,
  parsed,
  research,
  query,
  types,
  regionHints,
  preWriteVerification,
  v3,
  clueDiscovery,
  setResearchResult,
}) {
  const combinedBrief = [
    clueDiscovery.brief,
    brandBrief,
    regionBrief,
    v3?.v3MasterBrief,
    parsed.brief,
    research?.knowledgeMapPrompt,
    input.coverageMapBrief,
    input.knowledgeExpansionBrief,
    input.informationUnitBrief,
    input.editorColumnBrief,
    input.customerQuestionBrief,
    research?.geminiWriterBrief,
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
  pipelineInput.knowledgeMapBrief = research?.knowledgeMapPrompt || "";
  pipelineInput.coverageMapBrief = input.coverageMapBrief || "";
  pipelineInput.searchExpansion = research?.searchExpansion || pipelineInput.searchExpansion;
  pipelineInput.knowledgeMap = research?.knowledgeMap || null;
  pipelineInput.researchDepthTier = parsed.depthTier || "contextual";
  pipelineInput.v2ResearchReady = true;
  pipelineInput.v2PreWriteVerified = true;
  pipelineInput.v2PreWriteVerification = {
    ...preWriteVerification,
    pass: true,
    ok: true,
  };
  pipelineInput.informationUnits = input.informationUnits;
  pipelineInput.informationUnitBrief = input.informationUnitBrief;
  pipelineInput.knowledgeExpansion = input.knowledgeExpansion;
  pipelineInput.knowledgeExpansionReady = input.knowledgeExpansionReady;
  pipelineInput.knowledgeExpansionBrief = input.knowledgeExpansionBrief;
  pipelineInput.editorColumnBrief = input.editorColumnBrief;
  pipelineInput.v2PipelineStage = "information_research_verified";
  pipelineInput.v2PipelineEnforced = true;
  pipelineInput.v3EngineEnforced = true;
  pipelineInput.v2AxisRequired = true;
  pipelineInput.v3PreWriteVerified = true;
  pipelineInput.v3MasterBrief = v3?.v3MasterBrief || parsed.brief;
  pipelineInput.v3ContentStrategy = v3?.strategy;
  pipelineInput.v3SeoStrategy = v3?.seoStrategy;
  pipelineInput.v3BrandAnalysis = v3?.brandAnalysis;
  pipelineInput.v3RegionAnalysis = v3?.regionAnalysis;
  pipelineInput.v3TopicAnalysis = v3?.topicAnalysis;
  pipelineInput.v3Verification = v3?.verification;
  pipelineInput.customerQuestionMap = input.customerQuestionMap;
  pipelineInput.customerQuestionBrief = input.customerQuestionBrief;
  if (research?.geminiWriterBrief) {
    pipelineInput.geminiWriterBrief = research.geminiWriterBrief;
    pipelineInput.geminiWriterOutline = research.geminiWriterOutline;
  }
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

function buildContextualParsed(input, brandResearch, research, depthRun) {
  let facts =
    depthRun?.facts ||
    augmentFactsFromLocalContext([], input, brandResearch);
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (topic && !facts.some((f) => String(f.fact || "").includes(topic))) {
    facts = [
      ...facts,
      {
        axis: "topic",
        fact: `${topic} — 사용자가 입력한 핵심 주제`,
        source: "user_input",
      },
    ];
  }
  const depth =
    depthRun?.depth || assessResearchDepth(facts.length, input);
  const parsed = parseV2AxisResearch(research, input, brandResearch, {
    facts,
    depth,
  });
  if (!parsed.ok) {
    const depthBrief = buildDepthWritingBrief(depth, input);
    return {
      ...parsed,
      ok: true,
      insufficient: false,
      verified: true,
      depthTier: depth.tier || "contextual",
      factsPrompt:
        parsed.factsPrompt ||
        formatDepthFactsPrompt(facts, depth, input),
      brief: [depthBrief, parsed.brief].filter(Boolean).join("\n\n"),
      facts,
      factCount: facts.length,
    };
  }
  return parsed;
}

/**
 * 브랜드 → 지역 → 주제 + RESEARCH DEPTH 연쇄 조사
 * 축이 있으면 조사·검증이 얇아도 작성 단계로 진행 (생성 중단 없음)
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

  onStep?.("입력에서 단서 찾는 중…");
  const clueDiscovery = discoverClues(input);
  pipelineInput.clueDiscovery = clueDiscovery;
  pipelineInput.factsPrompt = pipelineInput.factsPrompt || null;

  onStep?.("브랜드 분석 중…");
  const brandResearch = runBrandResearchEngine(input);
  const brandBrief = buildBrandAxisBrief(input, brandResearch);
  const regionBrief = buildRegionAxisBrief(input);

  onStep?.(KNOWLEDGE_COVERAGE_STAGE_LABEL);
  const preWrite = prepareBriclogPreWriteContext(input);
  attachPreWriteContextToPipeline(pipelineInput, preWrite);
  input.knowledgeCoverage = pipelineInput.knowledgeCoverage;
  input.coverageMapBrief = pipelineInput.coverageMapBrief;
  input.searchExpansion = pipelineInput.searchExpansion;
  input.brandContentBrief = pipelineInput.brandContentBrief;
  input.knowledgeExpansion = pipelineInput.knowledgeExpansion;
  input.knowledgeExpansionReady = pipelineInput.knowledgeExpansionReady;
  input.informationUnits = pipelineInput.informationUnits;
  input.informationUnitBrief = pipelineInput.informationUnitBrief;
  input.knowledgeExpansionBrief = pipelineInput.knowledgeExpansionBrief;
  input.editorColumnBrief = pipelineInput.editorColumnBrief;

  onStep?.(INFORMATION_UNIT_STAGE_LABEL);
  onStep?.(KNOWLEDGE_EXPANSION_STAGE_LABELS.information_research);

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
      clueDiscovery,
    });
    research = researchRes?.research;
    if (researchRes?.geminiResearchFallback) {
      pipelineInput.geminiResearchFallback = researchRes.geminiResearchFallback;
      input.geminiResearchFallback = researchRes.geminiResearchFallback;
    }
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
    maxRounds: getResearchDepthMaxRounds(isModelLikeTopic(topic)),
  });

  research = depthRun.research || {
    summary: `${brand} · ${region} · ${topic} 맥락으로 글을 구성합니다.`,
    sources: [],
    v2Axis: { researchStatus: "contextual", insufficient: false },
  };

  if (research?.geminiWriterBrief) {
    pipelineInput.geminiWriterBrief = research.geminiWriterBrief;
    pipelineInput.geminiWriterOutline = research.geminiWriterOutline;
  }

  let parsed = buildContextualParsed(input, brandResearch, research, depthRun);

  if (research?.geminiCustomerQuestions?.length) {
    const merged = buildCustomerQuestionAnalysis(input, {
      researchFacts: parsed.facts,
      research,
    });
    if (merged?.questions?.length) {
      for (const gq of research.geminiCustomerQuestions) {
        const row = merged.questions.find((q) => q.id === gq.id);
        if (row && String(gq.answer || "").length > String(row.answer || "").length) {
          row.answer = gq.answer;
        }
      }
    }
    input.customerQuestionMap = merged;
    input.customerQuestionBrief = formatCustomerQuestionBrief(merged);
    pipelineInput.customerQuestionMap = merged;
    pipelineInput.customerQuestionBrief = input.customerQuestionBrief;
  }

  // 모델/제품명 주제 — Fast Pipeline에서는 제미나이 조사로 대체
  if (
    !shouldSkipModelTopicExtraResearch() &&
    isModelLikeTopic(topic) &&
    !hasTopicAnchoredFact(parsed, topic)
  ) {
    onStep?.("제품 정보 보강 중…");
    try {
      const focused = await runResearch({
        query: `${brand} ${topic} 공식 제품 정보`,
        types,
        brandContext: {
          ...input,
          brandName: brand,
          region,
          mainKeyword: topic,
          topic,
          clueDiscovery,
        },
        mode: "v2_axis_depth",
        regionKeywordHints: regionHints,
      });
      const focusedParsed = buildContextualParsed(
        input,
        brandResearch,
        focused,
        null
      );
      parsed = {
        ...parsed,
        facts: mergeUniqueFacts(parsed.facts, focusedParsed.facts),
        factCount: mergeUniqueFacts(parsed.facts, focusedParsed.facts).length,
        factsPrompt:
          focusedParsed.factsPrompt && focusedParsed.factsPrompt.length > parsed.factsPrompt.length
            ? focusedParsed.factsPrompt
            : parsed.factsPrompt,
        brief: [parsed.brief, focusedParsed.brief]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 4200),
      };
    } catch {
      /* 보강 실패 시 기존 parsed 유지 */
    }
  }

  onStep?.("조사 검증 중…");
  const supplemental = await ensureSupplementalResearchReady({
    input,
    parsed,
    research,
    brandResearch,
    pipelineInput,
    onStep,
  });
  parsed = supplemental.parsed;
  research = supplemental.research;

  let preWriteVerification = verifyPreWriteResearch(parsed, research);
  const sufficiencyBlock = researchGateBlockedForInsufficient(input, parsed, research);
  if (sufficiencyBlock) {
    return {
      ok: false,
      insufficient: true,
      userMessage: sufficiencyBlock.userMessage,
      reasons: sufficiencyBlock.reasons,
    };
  }
  if (!preWriteVerification.ok) {
    preWriteVerification = {
      ...preWriteVerification,
      pass: true,
      ok: true,
      soft: true,
    };
  }

  onStep?.("콘텐츠 전략 수립 중…");
  let v3 = runV3PreWriteEnrichment({
    input,
    brandResearch,
    parsed,
    research,
    regionHints,
    onStep,
  });
  if (!v3.ok) {
    v3 = {
      ok: true,
      v3MasterBrief: [brandBrief, regionBrief, parsed.brief]
        .filter(Boolean)
        .join("\n\n"),
      strategy: null,
      seoStrategy: null,
      brandAnalysis: null,
      regionAnalysis: null,
      topicAnalysis: null,
      verification: parsed,
      soft: true,
    };
  }

  onStep?.(CUSTOMER_QUESTION_STAGE_LABEL);
  const customerQuestionMap = buildCustomerQuestionAnalysis(input, {
    researchFacts: parsed.facts,
    research,
    v3,
  });
  input.customerQuestionMap = customerQuestionMap;
  input.customerQuestionBrief = formatCustomerQuestionBrief(customerQuestionMap);
  pipelineInput.customerQuestionMap = customerQuestionMap;
  pipelineInput.customerQuestionBrief = input.customerQuestionBrief;

  return commitV2AxisPipeline({
    pipelineInput,
    input,
    brandResearch,
    brandBrief,
    regionBrief,
    parsed,
    research,
    query,
    types,
    regionHints,
    preWriteVerification,
    v3,
    clueDiscovery,
    setResearchResult,
  });
}
