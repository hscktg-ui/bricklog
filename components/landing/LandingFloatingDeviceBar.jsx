"use client";

import DevicePreviewToggle from "./DevicePreviewToggle";
import { useLandingPreview } from "./LandingPreviewContext";

/**
 * 비로그인 랜딩 — 도움말 FAB 바로 위, 모바일·태블릿·PC 전환 (워크스페이스와 동일 위치감)
 */
export default function LandingFloatingDeviceBar({ className = "" }) {
  const { preview, setPreview, simulating } = useLandingPreview();

  return (
    <div
      className={`fixed inset-x-0 top-[49px] z-[28] flex flex-col gap-1.5 px-3 sm:left-auto sm:right-6 sm:top-auto sm:max-w-none sm:items-end sm:px-0 sm:bottom-[5.25rem] ${className}`}
      aria-label="화면 크기 미리보기"
    >
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#E8EBED] bg-white/95 px-2 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md sm:mx-0 sm:w-auto">
        <DevicePreviewToggle
          device={preview}
          onChange={setPreview}
          variant="tabs"
          showLabels
          compact
        />
      </div>
      <p className="max-w-[11rem] text-right text-[10px] leading-snug text-[#8B95A1]">
        {simulating ? "선택한 크기로 미리보기" : "지금 기기 크기"}
      </p>
    </div>
  );
}
