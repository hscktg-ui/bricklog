"use client";

import DevicePreviewToggle from "./DevicePreviewToggle";
import { useLandingPreview } from "./LandingPreviewContext";
import { devicePreviewCaption } from "@/lib/workspace/devicePreviewCopy";

/**
 * 비로그인 랜딩 — 모바일 하단, 폰·패드·PC 탭
 */
export default function LandingFloatingDeviceBar({ className = "" }) {
  const { preview, native, simulating, setPreview } = useLandingPreview();
  const caption = devicePreviewCaption({
    device: preview,
    native,
    simulating,
  });

  return (
    <div
      className={`fixed inset-x-0 z-[28] px-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:hidden ${className}`}
      aria-label="화면 크기"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-[#E8EBED]/70 bg-white/98 px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <p className="mb-1.5 text-center text-[11px] font-medium text-[#8B95A1]">
          {caption}
        </p>
        <DevicePreviewToggle
          device={preview}
          onChange={setPreview}
          variant="tabs"
          showLabels
          compact
          className="w-full"
        />
      </div>
    </div>
  );
}
