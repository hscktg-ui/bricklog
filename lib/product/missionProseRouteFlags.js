/**
 * Mission prose 강제 라우팅 플래그 — 순환 import 방지
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { isFurnitureChairProductTopic } from "@/lib/product/furnitureProductProseEngine";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { isBriclogResearchFirstEnforced } from "@/lib/config/researchFirstFlags";

export function shouldForceMissionProseOnlyPath(input = {}) {
  if (process.env.BRICLOG_FORCE_MISSION_PROSE === "false") return false;
  if (!isBriclogResetQualityEnforced()) return false;
  return isFlowerRecommendationTopic(input) || isFurnitureChairProductTopic(input);
}

export function allowsMissionProseDespiteThinResearch(input = {}) {
  return (
    shouldForceMissionProseOnlyPath(input) &&
    hasFilledBlogAxes(input) &&
    isBriclogResearchFirstEnforced()
  );
}
