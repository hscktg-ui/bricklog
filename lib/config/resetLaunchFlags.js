/**
 * BRICLOG RESET — 운영·베타 제한 플래그
 * 품질 안정화 기간: 홍보·결제 중단, 가입 제한, 90점 미만 노출 금지
 */

/** 품질 리셋 모드 — 90점 미만·placeholder·업종 오염 즉시 withhold */
export function isBriclogResetQualityEnforced() {
  if (process.env.BRICLOG_RESET_QUALITY === "false") return false;
  if (process.env.BRICLOG_RESET_QUALITY === "true") return true;
  return process.env.BRICLOG_MISSION !== "false";
}

/** 결제·유료 플랜 전환 차단 (베타 무료만) */
export function isBriclogResetPaymentPaused() {
  if (process.env.BRICLOG_RESET_PAYMENT_PAUSED === "false") return false;
  return (
    process.env.BRICLOG_RESET_PAYMENT_PAUSED === "true" ||
    isBriclogResetQualityEnforced()
  );
}

/** 신규 가입 제한 — waitlist 메시지 */
export function isBriclogResetSignupLimited() {
  return process.env.BRICLOG_RESET_SIGNUP_LIMIT === "true";
}

export const RESET_SIGNUP_LIMIT_MESSAGE =
  "지금은 품질 안정화 기간이라 신규 가입을 잠시 받지 않습니다. 곧 다시 열릴 예정이에요.";

export const RESET_QUALITY_WITHHOLD_MESSAGE =
  "아직 사람이 읽을 수 있는 편집본 기준에 닿지 않았어요. 입력을 조금 구체적으로 한 뒤 「다시 받기」를 눌러 주세요.";

/** 클라이언트(가입 화면)용 — 비밀 없음 */
export function getPublicResetLaunchFlags() {
  const qualityReset = isBriclogResetQualityEnforced();
  const devFreeze =
    process.env.BRICLOG_DEV_FREEZE === "false"
      ? false
      : process.env.BRICLOG_DEV_FREEZE === "true" || qualityReset;
  return {
    qualityReset,
    devFreeze,
    signupLimited: isBriclogResetSignupLimited(),
    signupLimitMessage: RESET_SIGNUP_LIMIT_MESSAGE,
    paymentPaused: isBriclogResetPaymentPaused(),
    qualityKpiTarget: 0.9,
  };
}
