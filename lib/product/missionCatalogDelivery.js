/**
 * Mission catalog 배달 — 꽃 추천·체어 등 카탈로그형 강제 프로즈 글값·분량 SSOT
 */
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import { resolveEditorColumnMinChars } from "@/lib/product/professionalEditorGradeEngine";

export const MISSION_CATALOG_MIN_CHAR_RATIO = 0.3;
export const MISSION_CATALOG_ABS_MIN_CHARS = 500;

export function isMissionCatalogDeliveryPack(pack, input = {}) {
  if (pack?._meta?.forcedMissionProseRoute === true) return true;
  return (
    pack?._meta?.missionProseFallback === true &&
    shouldForceMissionProseOnlyPath(input)
  );
}

export function resolveMissionCatalogMinChars(input = {}) {
  return resolveEditorColumnMinChars(input);
}

export function isMissionCatalogEvalPass(pack) {
  const ev = pack?._meta?.contentEvaluation;
  return ev?.pass === true || (typeof ev?.score === "number" && ev.score >= 90);
}
