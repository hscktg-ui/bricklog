/**
 * INFORMATION DENSITY ENGINE — 글 길이가 아닌 정보 밀도 평가
 */
import { countPreWriteInfoUnits } from "@/lib/product/topicProofGate";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { MIN_PREWRITE_INFO_UNITS } from "@/lib/product/topicProofThresholds";

export const INFORMATION_DENSITY_VERSION = "v1";
export const MIN_NEW_INFORMATION_UNITS = MIN_PREWRITE_INFO_UNITS;

export function assessPreWriteInformationDensity(input = {}) {
  const units = countPreWriteInfoUnits(input);
  return {
    version: INFORMATION_DENSITY_VERSION,
    stage: "pre_write",
    unitCount: units.unitCount,
    minRequired: MIN_NEW_INFORMATION_UNITS,
    ok: units.ok,
    message: units.ok
      ? null
      : `정보 단위가 ${units.unitCount}개입니다. 최소 ${MIN_NEW_INFORMATION_UNITS}개 필요 — 길게 쓰지 말고 조사를 보강하세요.`,
  };
}

export function assessPostWriteInformationDensity(pack, input = {}) {
  const full = getBlogFullText(pack);
  const yieldScore = scoreInformationYield(full, { input }, "blog");
  return {
    version: INFORMATION_DENSITY_VERSION,
    stage: "post_write",
    yieldScore: yieldScore.score,
    ok: yieldScore.ok,
    minRequired: MIN_NEW_INFORMATION_UNITS,
    message: yieldScore.ok
      ? null
      : "정보 밀도 부족 — 문장 반복·패딩 대신 조사 보강 후 재작성",
  };
}

export function formatInformationDensityBrief(assessment = {}) {
  return [
    "【정보 밀도 · INFORMATION DENSITY】",
    `평가 기준: 글자수 아님 · 새 정보 단위 ≥${MIN_NEW_INFORMATION_UNITS}`,
    assessment.stage === "pre_write"
      ? `확보 단위: ${assessment.unitCount ?? 0}`
      : `본문 정보 밀도: ${assessment.yieldScore ?? 0}`,
    assessment.ok ? "통과" : "부족 — 추가 조사",
  ].join("\n");
}
