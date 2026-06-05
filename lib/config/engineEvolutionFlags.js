/** 피드백 → 전역 엔진 규칙 자동 반영 (지인 베타 기본 켜짐) */
export function isAutoEvolveFromFeedbackEnabled() {
  if (process.env.BRICLOG_AUTO_EVOLVE_INSIGHTS === "0") return false;
  return (
    process.env.BRICLOG_AUTO_EVOLVE_INSIGHTS === "1" ||
    process.env.NODE_ENV === "production"
  );
}

/** 야간·집계 임계값 완화 — 초기 사용자 적을 때 */
export function isFriendBetaLearningMode() {
  if (process.env.BRICLOG_FRIEND_BETA_LEARNING === "0") return false;
  return (
    process.env.BRICLOG_FRIEND_BETA_LEARNING === "1" ||
    process.env.NODE_ENV === "production"
  );
}
