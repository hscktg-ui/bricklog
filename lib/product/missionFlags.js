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

/** 브랜드 기자·편집 시스템 (사실 추출·검증·3건 미만 작성 금지) */
export function isBrandJournalistDirectiveEnforced() {
  if (process.env.BRICLOG_BRAND_JOURNALIST === "false") return false;
  return isBriclogMissionEnforced();
}

/** NEXT EVOLUTION — 브랜드 이해·주제 증명·정보 밀도 파이프라인 */
export function isNextEvolutionDirectiveEnforced() {
  if (process.env.BRICLOG_NEXT_EVOLUTION === "false") return false;
  return isBriclogMissionEnforced();
}

/** TOPIC LOCK — 허용 엔티티 외 오염 차단 */
export function isTopicLockEnforced() {
  if (process.env.BRICLOG_TOPIC_LOCK === "false") return false;
  return isBriclogMissionEnforced();
}

/** TOPIC ANSWER — 제목에 대한 답 검증 */
export function isTopicAnswerEnforced() {
  if (process.env.BRICLOG_TOPIC_ANSWER === "false") return false;
  return isBriclogMissionEnforced();
}
