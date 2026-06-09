/** 야간 자동 학습·진화 (관리자 Run 버튼 대체) */

export function isNightlyAutoEvolutionEnabled() {
  if (process.env.BRICLOG_AUTO_NIGHTLY_EVOLUTION === "0") return false;
  return (
    process.env.BRICLOG_AUTO_NIGHTLY_EVOLUTION === "1" ||
    process.env.NODE_ENV === "production"
  );
}

export function nightlyQualityBatchSize() {
  return Math.min(
    12,
    Math.max(2, Number(process.env.BRICLOG_NIGHTLY_QT_BATCH) || 6)
  );
}

export function nightlyLabBatchSize() {
  return Math.min(
    8,
    Math.max(1, Number(process.env.BRICLOG_NIGHTLY_LAB_BATCH) || 4)
  );
}

export const NIGHTLY_EVOLUTION_SCHEDULE_KST = "01:30";

/** 관리자 수동 Run 차단 — 야간 크론·피드백 루프만 사용 */
export function isManualEvolutionRunBlocked() {
  if (process.env.BRICLOG_ALLOW_MANUAL_EVOLUTION_RUN === "1") return false;
  return isNightlyAutoEvolutionEnabled();
}
