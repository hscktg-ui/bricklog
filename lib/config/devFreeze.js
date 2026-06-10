/**
 * BRICLOG RESET — 신규 기능 개발 동결
 * 품질 안정화 완료 전: 이미지·요금제·신규 기능 추가 금지
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const DEV_FREEZE_FEATURES = {
  image: "image_generation",
  pricing: "pricing_checkout",
  new_feature: "new_feature",
};

export const DEV_FREEZE_USER_MESSAGE =
  "지금은 콘텐츠 품질 안정화 기간이라 해당 기능을 잠시 중단했습니다.";

/** 품질 KPI 90% 달성 전까지 기능 개발 동결 */
export function isBriclogDevFreezeActive() {
  if (process.env.BRICLOG_DEV_FREEZE === "false") return false;
  if (process.env.BRICLOG_DEV_FREEZE === "true") return true;
  return isBriclogResetQualityEnforced();
}

export function assertDevFreezeAllowed(featureKey) {
  if (!isBriclogDevFreezeActive()) {
    return { ok: true, feature: featureKey };
  }
  return {
    ok: false,
    feature: featureKey,
    frozen: true,
    userMessage: DEV_FREEZE_USER_MESSAGE,
  };
}
