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

const MISSION_CATALOG_BLOCKING_HARD_FAIL_RES =
  /placeholder|industry_|duplicate_content|unverified_claim|explain_hollow/;

/** 업종 칼럼 — 골든·해신 우수 시 dry_fact·꽃명 등 소프트 hardFail은 송출 허용 */
export function isMissionCatalogGoldenEvalBypass(pack = {}) {
  const ev = pack?._meta?.contentEvaluation;
  const industryColumn =
    pack?._meta?.industryHumanColumnEditorial === true ||
    pack?._meta?.flowerRecommendationEditorial === true;
  if (!industryColumn) return false;
  const golden = pack?._meta?.goldenGate?.score ?? pack?._meta?.goldenGateScore;
  const haeshin = pack?._meta?.goldenGate?.haeshin?.score ?? 0;
  if (typeof golden !== "number" || golden < 88 || haeshin < 72) return false;
  if (!ev?.hardFail) return true;
  const hardReasons = ev?.hardReasons || [];
  return !hardReasons.some((r) => MISSION_CATALOG_BLOCKING_HARD_FAIL_RES.test(r));
}

export function isMissionCatalogEvalPass(pack) {
  const ev = pack?._meta?.contentEvaluation;
  const industryColumn =
    pack?._meta?.industryHumanColumnEditorial === true ||
    pack?._meta?.flowerRecommendationEditorial === true;
  const passScore = industryColumn ? 88 : 90;
  if (ev?.pass === true) return true;
  if (typeof ev?.score === "number" && ev.score >= passScore) return true;
  if (isMissionCatalogGoldenEvalBypass(pack)) return true;
  if (industryColumn && ev?.hardFail !== true) {
    const golden = pack?._meta?.goldenGate?.score ?? pack?._meta?.goldenGateScore;
    const haeshin = pack?._meta?.goldenGate?.haeshin?.score ?? 0;
    if (typeof golden === "number" && golden >= 78 && haeshin >= 72) {
      return true;
    }
  }
  if (
    pack?._meta?.missionProseFallback === true &&
    pack?._meta?.llmGenerated !== true
  ) {
    const golden = pack?._meta?.goldenGate?.score ?? pack?._meta?.goldenGateScore;
    const haeshin = pack?._meta?.goldenGate?.haeshin?.score ?? 0;
    if (typeof golden === "number" && golden >= 78 && haeshin >= 68) {
      if (ev?.hardFail === true) {
        const hardReasons = ev?.hardReasons || [];
        if (hardReasons.some((r) => MISSION_CATALOG_BLOCKING_HARD_FAIL_RES.test(r))) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}
