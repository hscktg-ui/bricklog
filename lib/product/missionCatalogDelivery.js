/**
 * Mission catalog 배달 — 꽃 추천·체어 등 카탈로그형 강제 프로즈 글값·분량 SSOT
 */
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import { resolveEditorColumnMinChars } from "@/lib/product/professionalEditorGradeEngine";

export const MISSION_CATALOG_MIN_CHAR_RATIO = 0.3;
export const MISSION_CATALOG_ABS_MIN_CHARS = 500;

export function isMissionCatalogDeliveryPack(pack, input = {}) {
  if (pack?._meta?.industryHumanColumnEditorial === true) return true;
  if (pack?._meta?.flowerRecommendationEditorial === true) return true;
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
  const industryColumn =
    pack?._meta?.industryHumanColumnEditorial === true ||
    pack?._meta?.flowerRecommendationEditorial === true;
  const passScore = industryColumn ? 88 : 90;
  if (ev?.pass === true) return true;
  if (typeof ev?.score === "number" && ev.score >= passScore) return true;
  if (industryColumn && ev?.hardFail !== true) {
    const golden = pack?._meta?.goldenGate?.score ?? pack?._meta?.goldenGateScore;
    const haeshin = pack?._meta?.goldenGate?.haeshin?.score ?? 0;
    if (typeof golden === "number" && golden >= 78 && haeshin >= 72) {
      return true;
    }
  }
  return false;
}
