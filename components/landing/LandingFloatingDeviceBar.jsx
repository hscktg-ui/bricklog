"use client";

import DevicePreviewToggle from "./DevicePreviewToggle";
import { useLandingPreview } from "./LandingPreviewContext";

/**
 * 비로그인 랜딩 — 도움말 FAB 바로 위, 모바일·태블릿·PC 전환 (워크스페이스와 동일 위치감)
 */
export default function LandingFloatingDeviceBar() {
  const { preview, setPreview, simulating } = useLandingPreview();

  return (
    <div
      className="fixed right-4 z-[90] flex flex-col items-end gap-1.5 bottom-[calc(var(--landing-cta-h,4.75rem)+3.85rem+env(safe-area-inset-bottom,0px))] sm:right-6 sm:bottom-[5.25rem]"
      aria-label="화면 크기 미리보기"
    >
      <div className="rounded-2xl border border-[#E8EBED] bg-white/95 px-2 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
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
