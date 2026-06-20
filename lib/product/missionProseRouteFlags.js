/**
 * Mission prose 강제 라우팅 플래그 — 순환 import 방지
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { isFurnitureChairProductTopic } from "@/lib/product/furnitureProductProseEngine";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { isBriclogResearchFirstEnforced } from "@/lib/config/researchFirstFlags";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isBriclogMasterRebuildEnforced } from "@/lib/config/masterRebuildFlags";
import { isResearchHeavyTopicInput, isLocalServicePromoTopic } from "@/lib/content/topicFacetEngine";

export function shouldForceMissionProseOnlyPath(input = {}) {
  if (isGpt55WriterDominant()) return false;
  if (process.env.BRICLOG_FORCE_MISSION_PROSE === "false") return false;
  if (!isBriclogResetQualityEnforced()) return false;
  return isFlowerRecommendationTopic(input) || isFurnitureChairProductTopic(input);
}

export function allowsMissionProseDespiteThinResearch(input = {}) {
  if (isBriclogMasterRebuildEnforced() || isGpt55WriterDominant()) return false;
  return (
    shouldForceMissionProseOnlyPath(input) &&
    hasFilledBlogAxes(input) &&
    isBriclogResearchFirstEnforced()
  );
}

/** GPT-5.5 Writer 우선이어도 조사·스펙형·꽃·체어 주제는 mission prose 송출 허용 */
export function shouldResearchHeavyMissionRescue(input = {}) {
  if (!isBriclogResetQualityEnforced()) return false;
  if (!hasFilledBlogAxes(input)) return false;
  return (
    isResearchHeavyTopicInput(input) ||
    isFlowerRecommendationTopic(input) ||
    isFurnitureChairProductTopic(input)
  );
}

/** 학원·공방·살롱 등 로컬 프로모 — LLM thin draft 대신 mission 송출 (orchestrator 전용) */
export function shouldLocalServicePromoMissionRescue(input = {}) {
  if (!isBriclogResetQualityEnforced()) return false;
  if (!hasFilledBlogAxes(input)) return false;
  return isLocalServicePromoTopic(input);
}

export function shouldOrchestratorMissionRescue(input = {}) {
  return (
    shouldResearchHeavyMissionRescue(input) ||
    shouldLocalServicePromoMissionRescue(input)
  );
}
