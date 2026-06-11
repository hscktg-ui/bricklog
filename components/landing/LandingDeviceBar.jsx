"use client";

import DevicePreviewToggle from "./DevicePreviewToggle";
import {
  DEVICE_PREVIEW_HEADLINE,
  devicePreviewCaption,
} from "@/lib/workspace/devicePreviewCopy";

/**
 * 랜딩·로그인 — 폰 / 패드 / PC (한 줄 혜택 + 탭)
 */
export default function LandingDeviceBar({
  device,
  onChange,
  simulating = false,
  native = device,
  compact = false,
  className = "",
}) {
  const caption = devicePreviewCaption({
    device,
    native,
    simulating,
  });

  return (
    <div
      className={`flex flex-col gap-2.5 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between sm:gap-4"} ${className}`}
    >
      <div className="min-w-0 flex-1 text-center sm:text-left">
        {!compact ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B95A1]">
            {DEVICE_PREVIEW_HEADLINE}
          </p>
        ) : null}
        <p
          className={`${compact ? "mt-0" : "mt-0.5"} text-[12px] font-medium leading-snug text-[#4E5968] sm:text-[13px]`}
        >
          {caption}
        </p>
      </div>
      <DevicePreviewToggle
        device={device}
        onChange={onChange}
        variant="tabs"
        showLabels
        compact={compact}
        className={compact ? "w-full" : "mx-auto shrink-0 sm:mx-0"}
      />
    </div>
  );
}
