"use client";

import { useState } from "react";
import SketchDeviceIcon from "@/components/icons/SketchDeviceIcon";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import {
  DEVICE_EMOJI,
  DEVICE_TAB_SHORT,
  deviceCycleAriaLabel,
  deviceTabAriaLabel,
} from "@/lib/workspace/devicePreviewCopy";
import {
  DEVICE_LABELS,
  nextPreviewDevice,
} from "@/lib/workspace/devicePreviewCycle";
import {
  VISION_DEVICE_TAB_ACTIVE,
  VISION_DEVICE_TAB_IDLE,
  VISION_PANEL,
} from "@/lib/landing/vision2030Styles";

/** @typedef {'mobile'|'tablet'|'desktop'} DevicePreviewId */

export const DEVICE_PREVIEW_WIDTHS = {
  mobile: 390,
  tablet: 768,
  desktop: 1100,
};

const DEVICE_OPTIONS = [
  { id: "mobile", label: DEVICE_TAB_SHORT.mobile },
  { id: "tablet", label: DEVICE_TAB_SHORT.tablet },
  { id: "desktop", label: DEVICE_TAB_SHORT.desktop },
];

/** @param {DevicePreviewId} [initial] */
export function useDevicePreview(initial = "desktop") {
  const [device, setDevice] = useState(initial);
  return {
    device,
    setDevice,
    maxWidth: DEVICE_PREVIEW_WIDTHS[device],
  };
}

export default function DevicePreviewToggle({
  device,
  onChange,
  className = "",
  /** @type {'tabs'|'cycle'} */
  variant = "tabs",
  /** 탭에 폰·패드·PC + 이모지 */
  showLabels = false,
  compact = false,
}) {
  if (variant === "cycle") {
    const next = nextPreviewDevice(device);
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-label={deviceCycleAriaLabel(device, next)}
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--vision-line-strong)] bg-white/80 px-4 py-2.5 text-[12px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] backdrop-blur-sm transition hover:bg-white sm:text-[13px] ${className}`}
      >
        <span className="text-[15px] leading-none" aria-hidden>
          {DEVICE_EMOJI[device]}
        </span>
        <SketchDeviceIcon device={device} active className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-[12px] font-bold text-[var(--vision-ink)]">
          {DEVICE_TAB_SHORT[device]}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex rounded-full border border-[var(--vision-line)] bg-[var(--vision-paper)] p-1 shadow-[inset_0_1px_2px_rgba(5,5,6,0.04)] ${compact ? "w-full justify-between gap-0.5" : ""} ${className}`}
      role="tablist"
      aria-label="화면 크기"
    >
      {DEVICE_OPTIONS.map(({ id, label }) => {
        const active = device === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${
              showLabels
                ? compact
                  ? "min-h-[44px] flex-1 flex-col gap-0.5 rounded-xl px-1 py-1.5 sm:flex-row sm:gap-1.5 sm:rounded-lg"
                  : "min-h-[44px] gap-1.5 rounded-lg px-3 py-2 sm:px-3.5"
                : "h-11 w-11 rounded-lg sm:h-12 sm:w-12"
            } ${active ? `${VISION_DEVICE_TAB_ACTIVE} scale-[1.02]` : VISION_DEVICE_TAB_IDLE}`}
            title={`${DEVICE_LABELS[id]} · ${label}`}
            aria-label={deviceTabAriaLabel(id)}
          >
            {showLabels ? (
              <>
                <span
                  className={`text-[14px] leading-none sm:text-[15px] ${active ? "opacity-100" : "opacity-80"}`}
                  aria-hidden
                >
                  {DEVICE_EMOJI[id]}
                </span>
                <span className="text-[11px] font-bold tracking-tight sm:text-[12px]">
                  {label}
                </span>
              </>
            ) : (
              <>
                <SketchDeviceIcon
                  device={id}
                  active={active}
                  onGreenBg={active}
                  className="h-5 w-5 sm:h-6 sm:w-6"
                />
                <span className="sr-only">{label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DevicePreviewFrame({ device, children, className = "" }) {
  const maxWidth = DEVICE_PREVIEW_WIDTHS[device];

  return (
    <div
      className={`mx-auto w-full transition-[max-width] duration-300 ease-out ${className}`}
      style={{ maxWidth }}
    >
      <div className={`overflow-hidden ${VISION_PANEL}`}>
        <LandingPanelHeader
          title={`${DEVICE_EMOJI[device]} ${DEVICE_TAB_SHORT[device]} · 브릭로그`}
          className="bg-white"
        />
        <div className="bg-white p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
