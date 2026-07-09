/**
 * 무료 런치 SSOT — PG 미연동·인사이트 수집 기간 전 기능 개방
 * 유료화 시 BRICLOG_FREE_LAUNCH=false + 결제 연동 후 checkout on
 */
import { isBriclogResetPaymentPaused } from "@/lib/config/resetLaunchFlags";

export const FREE_LAUNCH_MODE_VERSION = "free-launch-v1";

export const FREE_LAUNCH_USER_MESSAGE =
  "브릭로그는 지금 무료입니다. 스튜디오 전 기능(이야기·플레이스·인스타·브랜드 기억)을 제한 없이 이용할 수 있습니다.";

export const FREE_LAUNCH_PAYMENT_NOTE =
  "유료 플랜·결제는 충분한 사용 인사이트를 모은 뒤 순차 도입할 예정입니다. PG 심사·연동 비용 없이 먼저 도구 가치를 검증합니다.";

/** @returns {boolean} */
export function isBriclogFreeLaunchMode() {
  if (process.env.BRICLOG_FREE_LAUNCH === "false") return false;
  if (process.env.BRICLOG_FREE_LAUNCH === "true") return true;
  return isBriclogResetPaymentPaused();
}

/** @returns {{ planId: string, source: string, bypassQuotas: boolean } | null} */
export function freeLaunchPlanOverride() {
  if (!isBriclogFreeLaunchMode()) return null;
  return {
    planId: "studio",
    source: "free_launch",
    bypassQuotas: true,
  };
}
