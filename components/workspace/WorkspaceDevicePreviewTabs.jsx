"use client";

import DevicePreviewToggle from "@/components/landing/DevicePreviewToggle";
import { useWorkspacePreview } from "@/context/WorkspacePreviewContext";
import { DEVICE_LABELS } from "@/lib/workspace/devicePreviewCycle";
/**
 * 로그인 작업실 — 모바일에서 모바일·태블릿·PC 탭 (한 번에 선택)
 */
export default function WorkspaceDevicePreviewTabs({ className = "" }) {
  const { preview, native, simulating, setPreview } = useWorkspacePreview();

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[44] px-3 bottom-[calc(var(--workspace-mobile-nav-h,3.5rem)+0.35rem+env(safe-area-inset-bottom,0px))] ${className}`}
      aria-label="화면 크기 미리보기"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#E8EBED] bg-white/95 px-2 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md">
        <DevicePreviewToggle
          device={preview}
          onChange={setPreview}
          variant="tabs"
          showLabels
          compact
          className="w-full"
        />
        <p className="mt-1.5 text-center text-[10px] leading-snug text-[#8B95A1]">
          {simulating
            ? `${DEVICE_LABELS[preview]} 화면으로 미리보는 중`
            : `지금 기기 · ${DEVICE_LABELS[native]}`}
        </p>
      </div>
    </div>
  );
}
