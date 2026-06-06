/**
 * BRICLOG Pre-Write Context — Knowledge Expansion Pipeline
 */
import { runKnowledgeExpansionPipeline } from "@/lib/content/knowledgeExpansionEngine";
import { formatCoverageMapForPrompt } from "@/lib/content/knowledgeCoverageEngine";
import { buildBrandContentPromptBlock } from "@/lib/content/brandContentEngine";
import { buildPerspectivePromptBlock } from "@/lib/content/perspectiveEngine";
import {
  buildCustomerQuestionAnalysis,
  formatCustomerQuestionBrief,
} from "@/lib/content/customerQuestionEngine";
import { buildDeepLearningPreWriteBrief, inferCustomerSituations } from "@/lib/product/deepLearningEngine";
import { attachPublishPurpose } from "@/lib/content/publishPurposeEngine";
import { buildStructureVarietyBrief } from "@/lib/content/structureVarietyGate";
import {
  buildBrandWiki,
  formatBrandWikiBrief,
  assessBrandWikiReadiness,
} from "@/lib/evolution/brandWikiEngine";
import { loadHumanCorrectionBriefFromBrand } from "@/lib/evolution/humanCorrectionEngine";
import { buildPerformanceLearningBrief } from "@/lib/evolution/performanceLearningEngine";
import { getPriorityDevelopmentBrief } from "@/lib/product/briclogPriority";
import {
  lockGenerationContext,
  formatContextLockBrief,
} from "@/lib/content/contextLockEngine";
import {
  buildDirectorMasterBrief,
  collectDirectorFeedbackSources,
} from "@/lib/product/directorContextEngine";
import {
  buildTopicMap,
  formatTopicMapBrief,
} from "@/lib/product/topicMapEngine";
import { assertTopicProofPreWrite } from "@/lib/product/topicProofGate";

/**
 * 조사·생성 전 공통 컨텍스트
 * 입력 → 주제 분해 → 정보 조사(검색 확장) → 정보 확장 준비 → 에디터 작성
 * @param {Record<string, unknown>} input
 */
export function prepareBriclogPreWriteContext(input = {}) {
  const withPurpose = attachPublishPurpose(input);
  const expansion = runKnowledgeExpansionPipeline(withPurpose);
  const customerQuestionMap = buildCustomerQuestionAnalysis(withPurpose, {
    researchFacts: withPurpose.researchFacts,
  });
  const customerSituations = inferCustomerSituations(withPurpose);
  const brandWiki = buildBrandWiki(withPurpose);
  const brandWikiReadiness = assessBrandWikiReadiness(withPurpose);
  const humanCorrectionBrief = loadHumanCorrectionBriefFromBrand(
    withPurpose.brandMemory
  );
  const performanceLearningBrief = buildPerformanceLearningBrief(withPurpose);
  const contextLockResult = lockGenerationContext(withPurpose);
  const contextLock = contextLockResult.lock;
  const contextLockBrief = formatContextLockBrief(contextLock);
  const topicMap = buildTopicMap(withPurpose);
  const topicProof = assertTopicProofPreWrite({ ...withPurpose, topicMap });

  const enriched = {
    ...withPurpose,
    contextLock,
    contextLockBrief,
    contextLockOk: contextLockResult.ok,
    knowledgeCoverage: expansion.knowledgeCoverage,
    topicFacets: expansion.topicFacets,
    coverageMapBrief: formatCoverageMapForPrompt(expansion.knowledgeCoverage),
    informationUnits: expansion.informationUnits,
    informationUnitBrief: expansion.informationUnitBrief,
    topicDecompositionBrief: expansion.topicDecompositionBrief,
    editorReconstructionBrief: expansion.editorReconstructionBrief,
    editorColumnBrief: expansion.editorColumnBrief,
    knowledgeExpansionBrief: expansion.expansionBrief,
    searchExpansion: expansion.searchExpansion,
    knowledgeExpansion: expansion,
    knowledgeExpansionReady: expansion.ready,
    brandContentBrief: buildBrandContentPromptBlock(),
    perspectiveBrief: buildPerspectivePromptBlock(input, input),
    customerQuestionMap,
    customerQuestionBrief: formatCustomerQuestionBrief(customerQuestionMap),
    customerSituations,
    deepLearningBrief: buildDeepLearningPreWriteBrief(withPurpose),
    publishPurposeBrief: withPurpose.publishPurposeBrief,
    structureVarietyBrief: buildStructureVarietyBrief(withPurpose),
    brandWiki,
    brandWikiBrief: formatBrandWikiBrief(brandWiki),
    brandWikiReadiness,
    humanCorrectionBrief,
    performanceLearningBrief,
    priorityBrief: getPriorityDevelopmentBrief(),
    topicMap,
    topicMapBrief: formatTopicMapBrief(topicMap),
    topicProof,
    topicProofOk: topicProof.ok,
    topicProofMetrics: topicProof.metrics,
  };

  enriched.directorMasterBrief = buildDirectorMasterBrief(enriched);
  enriched.directorFeedbackSources = collectDirectorFeedbackSources(enriched);

  return enriched;
}

export function attachPreWriteContextToPipeline(pipelineInput = {}, preWrite = null) {
  const ctx = preWrite || prepareBriclogPreWriteContext(pipelineInput);
  Object.assign(pipelineInput, {
    knowledgeCoverage: ctx.knowledgeCoverage,
    topicFacets: ctx.topicFacets,
    coverageMapBrief: ctx.coverageMapBrief,
    informationUnits: ctx.informationUnits,
    informationUnitBrief: ctx.informationUnitBrief,
    topicDecompositionBrief: ctx.topicDecompositionBrief,
    editorReconstructionBrief: ctx.editorReconstructionBrief,
    editorColumnBrief: ctx.editorColumnBrief,
    knowledgeExpansionBrief: ctx.knowledgeExpansionBrief,
    searchExpansion: ctx.searchExpansion,
    knowledgeExpansion: ctx.knowledgeExpansion,
    knowledgeExpansionReady: ctx.knowledgeExpansionReady,
    brandContentBrief: ctx.brandContentBrief,
    perspectiveBrief: ctx.perspectiveBrief,
    customerQuestionMap: ctx.customerQuestionMap,
    customerQuestionBrief: ctx.customerQuestionBrief,
    customerSituations: ctx.customerSituations,
    deepLearningBrief: ctx.deepLearningBrief,
    publishPurposeBrief: ctx.publishPurposeBrief,
    structureVarietyBrief: ctx.structureVarietyBrief,
    brandWiki: ctx.brandWiki,
    brandWikiBrief: ctx.brandWikiBrief,
    brandWikiReadiness: ctx.brandWikiReadiness,
    humanCorrectionBrief: ctx.humanCorrectionBrief,
    performanceLearningBrief: ctx.performanceLearningBrief,
    priorityBrief: ctx.priorityBrief,
    topicMap: ctx.topicMap,
    topicMapBrief: ctx.topicMapBrief,
    topicProof: ctx.topicProof,
    topicProofOk: ctx.topicProofOk,
    topicProofMetrics: ctx.topicProofMetrics,
    contextLock: ctx.contextLock,
    contextLockBrief: ctx.contextLockBrief,
    contextLockOk: ctx.contextLockOk,
    directorMasterBrief: ctx.directorMasterBrief,
    directorFeedbackSources: ctx.directorFeedbackSources,
  });
  return pipelineInput;
}
