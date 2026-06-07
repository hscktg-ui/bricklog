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
import {
  buildBrandInvestigationReport,
  formatBrandInvestigationBrief,
} from "@/lib/product/brandJournalistDirective";
import {
  assertNextEvolutionPreWrite,
  buildNextEvolutionPromptBlock,
} from "@/lib/product/briclogNextEvolutionDirective";
import { buildBrandDnaPromptBlock } from "@/lib/product/brandDnaEngine";
import { filterUsableFactsForBody, formatConfidenceBrief } from "@/lib/product/confidenceEngine";
import {
  assessPreWriteInformationDensity,
  formatInformationDensityBrief,
} from "@/lib/product/informationDensityEngine";
import {
  assessBrandKnowledge,
  formatBrandKnowledgeBrief,
} from "@/lib/product/brandKnowledgeEngine";
import {
  assertTopicLockPreWrite,
  buildTopicLock,
  formatTopicLockBrief,
} from "@/lib/product/topicLockEngine";
import {
  buildTitleAnswerChecklist,
  formatTopicAnswerBrief,
} from "@/lib/product/topicAnswerEngine";

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
  const topicMap = buildTopicMap(withPurpose);
  const brandWiki = buildBrandWiki({ ...withPurpose, topicMap });
  const brandWikiReadiness = assessBrandWikiReadiness({ ...withPurpose, topicMap });
  const humanCorrectionBrief = loadHumanCorrectionBriefFromBrand(
    withPurpose.brandMemory
  );
  const performanceLearningBrief = buildPerformanceLearningBrief(withPurpose);
  const contextLockResult = lockGenerationContext(withPurpose);
  const contextLock = contextLockResult.lock;
  const contextLockBrief = formatContextLockBrief(contextLock);
  const topicProof = assertTopicProofPreWrite({ ...withPurpose, topicMap });
  const brandInvestigationReport = buildBrandInvestigationReport(withPurpose);
  const brandInvestigationBrief = formatBrandInvestigationBrief(
    brandInvestigationReport
  );
  const nextEvolutionPreWrite = assertNextEvolutionPreWrite(withPurpose);
  const brandKnowledge = assessBrandKnowledge({ ...withPurpose, topicMap, brandWikiBrief: formatBrandWikiBrief(brandWiki) });
  const confidenceFilter = filterUsableFactsForBody(withPurpose);
  const informationDensity = assessPreWriteInformationDensity(withPurpose);
  const topicLock = buildTopicLock({ ...withPurpose, topicMap });
  const topicLockGate = assertTopicLockPreWrite({ ...withPurpose, topicLock, topicMap });
  const titleAnswerChecklist = buildTitleAnswerChecklist(
    String(withPurpose.topic || withPurpose.mainKeyword || "").trim(),
    { ...withPurpose, topicMap }
  );

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
    brandInvestigationReport,
    brandInvestigationBrief,
    brandInvestigationReady: brandInvestigationReport.readyForWrite,
    brandInvestigationTrustScore: brandInvestigationReport.trustScore,
    nextEvolutionPreWrite,
    nextEvolutionBrief: buildNextEvolutionPromptBlock(withPurpose),
    brandKnowledge,
    brandKnowledgeBrief: formatBrandKnowledgeBrief(brandKnowledge),
    confidenceFilter,
    confidenceBrief: formatConfidenceBrief(confidenceFilter),
    informationDensity,
    informationDensityBrief: formatInformationDensityBrief(informationDensity),
    brandDnaBrief: buildBrandDnaPromptBlock(withPurpose),
    contentDesignBrief: nextEvolutionPreWrite.contentDesignBrief,
    topicLock,
    topicLockGate,
    topicLockBrief: formatTopicLockBrief(topicLock),
    topicLockOk: topicLockGate.ok,
    titleAnswerChecklist,
    titleAnswerBrief: formatTopicAnswerBrief(titleAnswerChecklist),
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
    brandInvestigationReport: ctx.brandInvestigationReport,
    brandInvestigationBrief: ctx.brandInvestigationBrief,
    brandInvestigationReady: ctx.brandInvestigationReady,
    brandInvestigationTrustScore: ctx.brandInvestigationTrustScore,
    nextEvolutionPreWrite: ctx.nextEvolutionPreWrite,
    nextEvolutionBrief: ctx.nextEvolutionBrief,
    brandKnowledge: ctx.brandKnowledge,
    brandKnowledgeBrief: ctx.brandKnowledgeBrief,
    confidenceFilter: ctx.confidenceFilter,
    confidenceBrief: ctx.confidenceBrief,
    informationDensity: ctx.informationDensity,
    informationDensityBrief: ctx.informationDensityBrief,
    brandDnaBrief: ctx.brandDnaBrief,
    contentDesignBrief: ctx.contentDesignBrief,
    topicLock: ctx.topicLock,
    topicLockGate: ctx.topicLockGate,
    topicLockBrief: ctx.topicLockBrief,
    topicLockOk: ctx.topicLockOk,
    titleAnswerChecklist: ctx.titleAnswerChecklist,
    titleAnswerBrief: ctx.titleAnswerBrief,
  });
  return pipelineInput;
}
