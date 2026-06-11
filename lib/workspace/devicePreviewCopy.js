/** PC · 패드 · 폰 미리보기 — UI 카피 SSOT (짧고, 한 줄, 혜택 중심) */

/** @typedef {import('./devicePreviewCycle').DeviceId} DeviceId */

export const DEVICE_EMOJI = {
  mobile: "📱",
  tablet: "📋",
  desktop: "💻",
};

/** 탭·FAB — 한 글자도 아까운 라벨 */
export const DEVICE_TAB_SHORT = {
  mobile: "폰",
  tablet: "패드",
  desktop: "PC",
};

/** 기기별 한 줄 — 기능이 아니라 결과 */
export const DEVICE_BENEFIT = {
  mobile: "주머니에서 확인, 바로 복사",
  tablet: "넓게 보고 가볍게 다듬기",
  desktop: "크게 보고 기록까지",
};

/** 상단 라벨 — 작게, 필요할 때만 */
export const DEVICE_PREVIEW_HEADLINE = "미리보기";

/**
 * @param {{ device: DeviceId, native: DeviceId, simulating: boolean }} p
 */
export function devicePreviewCaption({ device, native, simulating }) {
  if (!simulating) {
    return `${DEVICE_BENEFIT[native]}`;
  }
  return `${DEVICE_TAB_SHORT[device]} · ${DEVICE_BENEFIT[device]}`;
}

/**
 * @param {DeviceId} device
 * @param {number} scalePct 0–100
 */
export function devicePreviewScaleCaption(device, scalePct) {
  return `${DEVICE_TAB_SHORT[device]} · ${scalePct}%`;
}

/** @param {DeviceId} device */
export function deviceTabAriaLabel(device) {
  return `${DEVICE_TAB_SHORT[device]} 화면으로 보기`;
}

/** @param {DeviceId} device */
export function deviceCycleAriaLabel(device, next) {
  return `지금 ${DEVICE_TAB_SHORT[device]} · 누르면 ${DEVICE_TAB_SHORT[next]}`;
}
