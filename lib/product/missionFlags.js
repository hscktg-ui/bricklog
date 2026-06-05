/** Mission ON/OFF — 의존성 없음 (순환 import 방지) */
export function isBriclogMissionEnforced() {
  return process.env.BRICLOG_MISSION !== "false";
}

export function isLengthPaddingForbidden() {
  return isBriclogMissionEnforced();
}

export function isLengthOnlyGateSoft() {
  return isBriclogMissionEnforced();
}

export function isCoverageExpansionForbidden() {
  return isBriclogMissionEnforced();
}
