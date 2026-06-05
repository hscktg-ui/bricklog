/** @typedef {import('./devicePreviewCycle').DeviceId} DeviceId */

import { DEVICE_WIDTHS } from "./devicePreviewCycle";

/**
 * @param {DeviceId} deviceId
 */
export function layoutForDevice(deviceId) {
  return {
    isMobile: deviceId === "mobile",
    isTablet: deviceId === "tablet",
    isDesktop: deviceId === "desktop",
    narrow: deviceId !== "desktop",
  };
}

/**
 * 좁은 실제 화면에서 넓은 미리보기를 맞추기 위한 스케일
 * @param {number} targetWidth
 * @param {number} viewportWidth
 * @param {number} [padding]
 */
export function previewScaleForViewport(targetWidth, viewportWidth, padding = 32) {
  const available = Math.max(280, viewportWidth - padding);
  if (targetWidth <= available) {
    return { mode: "fit", width: targetWidth, scale: 1 };
  }
  const scale = available / targetWidth;
  return { mode: "scale", width: targetWidth, scale: Number(scale.toFixed(4)) };
}

export { DEVICE_WIDTHS };
