/** @typedef {'mobile'|'tablet'|'desktop'} DeviceId */

export const DEVICE_WIDTHS = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};

export const DEVICE_LABELS = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "PC",
};

/** @deprecated — SketchDeviceIcon 컴포넌트 사용 */
export const DEVICE_ICONS = {
  mobile: "mobile",
  tablet: "tablet",
  desktop: "desktop",
};

/** @deprecated UI — SketchDeviceIcon + sr-only */
export const DEVICE_SHORT = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "PC",
};

const ORDER = /** @type {DeviceId[]} */ (["mobile", "tablet", "desktop"]);

/**
 * @param {{ isMobile: boolean, isTablet: boolean }} vp
 * @returns {DeviceId}
 */
export function nativeDeviceFromViewport(vp) {
  if (vp.isMobile) return "mobile";
  if (vp.isTablet) return "tablet";
  return "desktop";
}

/** @param {DeviceId} current */
export function nextPreviewDevice(current) {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length];
}

/**
 * @param {DeviceId} preview
 * @param {DeviceId} native
 */
export function isSimulatedPreview(preview, native) {
  if (native === "mobile") return false;
  return preview !== native;
}

/**
 * Vision 2030 — 기기별 네이티브 레이아웃만 사용 (PC에서 PC·폰 토글 금지)
 * @param {DeviceId} [_native]
 */
export function canUseDevicePreviewSimulation(_native) {
  return false;
}
