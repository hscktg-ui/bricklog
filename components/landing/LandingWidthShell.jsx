"use client";

import { DEVICE_PREVIEW_WIDTHS } from "./DevicePreviewToggle";

/**
 * 선택한 기기 너비로 랜딩 본문을 감싸 실제 레이아웃이 바뀌게 함
 */
export default function LandingWidthShell({
  device,
  simulating = false,
  children,
  className = "",
}) {
  const maxWidth =
    simulating && device !== "desktop"
      ? DEVICE_PREVIEW_WIDTHS[device]
      : undefined;

  return (
    <div
      className={`mx-auto w-full transition-[max-width] duration-300 ease-out ${className}`}
      style={maxWidth ? { maxWidth } : undefined}
      data-landing-preview={device}
    >
      {children}
    </div>
  );
}
