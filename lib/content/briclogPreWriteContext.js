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
  const enriched = {
    ...withPurpose,
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
  };
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
  });
  return pipelineInput;
}
