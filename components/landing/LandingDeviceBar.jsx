"use client";

import DevicePreviewToggle from "./DevicePreviewToggle";
import SketchDeviceIcon from "@/components/icons/SketchDeviceIcon";
import { DEVICE_LABELS } from "@/lib/workspace/devicePreviewCycle";

/**
 * 랜딩·로그인 — 모바일/태블릿/PC 라벨 항상 노출
 */
export default function LandingDeviceBar({
  device,
  onChange,
  simulating = false,
  compact = false,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-center gap-2">
        <SketchDeviceIcon
          device={device}
          active={simulating}
          className="h-5 w-5 shrink-0"
        />
        <p className="text-[12px] leading-snug text-[#4E5968] sm:text-[13px]">
          <span className="font-semibold text-[#03A94D]">
            {DEVICE_LABELS[device]}
          </span>
          {simulating ? (
            <span> 화면으로 미리보는 중</span>
          ) : (
            <span> · 지금 이 기기 크기</span>
          )}
        </p>
      </div>
      <DevicePreviewToggle
        device={device}
        onChange={onChange}
        variant="tabs"
        showLabels
        compact={compact}
      />
    </div>
  );
}
