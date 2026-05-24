"use client";

import { useState } from "react";
import SketchDeviceIcon from "@/components/icons/SketchDeviceIcon";
import {
  DEVICE_LABELS,
  nextPreviewDevice,
} from "@/lib/workspace/devicePreviewCycle";
import {
  DEVICE_TAB_ACTIVE,
  DEVICE_TAB_IDLE,
  GREEN_CTA_OUTLINE,
} from "@/lib/ui/actionButtonStyles";

/** @typedef {'mobile'|'tablet'|'desktop'} DevicePreviewId */

export const DEVICE_PREVIEW_WIDTHS = {
  mobile: 390,
  tablet: 768,
  desktop: 1100,
};

const DEVICE_OPTIONS = [
  { id: "mobile", label: "모바일" },
  { id: "tablet", label: "태블릿" },
  { id: "desktop", label: "PC" },
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
  /** 탭에 모바일·태블릿·PC 텍스트 표시 */
  showLabels = false,
  compact = false,
}) {
  if (variant === "cycle") {
    const next = nextPreviewDevice(device);
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-label={`미리보기 ${DEVICE_LABELS[device]}. 누르면 ${DEVICE_LABELS[next]} 화면`}
        className={`inline-flex items-center gap-2 rounded-xl border-2 border-[#03C75A]/40 bg-[#F8FDF9] px-4 py-2 text-[12px] font-semibold text-[#03A94D] shadow-sm hover:border-[#03C75A] hover:bg-[#E8F9EF] sm:text-[13px] ${className}`}
      >
        <SketchDeviceIcon device={device} active className="h-6 w-6" />
        <span className="text-[11px] font-semibold text-[#191F28]">
          {DEVICE_LABELS[device]}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-1 ${compact ? "w-full justify-between" : ""} ${className}`}
      role="tablist"
      aria-label="미리보기 화면 크기"
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
            className={`inline-flex items-center justify-center gap-1 rounded-lg transition-colors ${
              showLabels
                ? compact
                  ? "min-h-9 flex-1 px-1 py-1.5"
                  : "min-h-10 px-2.5 py-2 sm:px-3"
                : "h-10 w-10 sm:h-11 sm:w-11"
            } ${active ? DEVICE_TAB_ACTIVE : DEVICE_TAB_IDLE}`}
            title={`${label} 화면`}
            aria-label={`${label} 미리보기`}
          >
            <SketchDeviceIcon
              device={id}
              active={active}
              onGreenBg={active}
              className={showLabels ? "h-4 w-4 sm:h-5 sm:w-5" : "h-5 w-5 sm:h-6 sm:w-6"}
            />
            {showLabels ? (
              <span className="text-[10px] font-semibold sm:text-[11px]">
                {label}
              </span>
            ) : (
              <span className="sr-only">{label}</span>
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
      <div className="overflow-hidden rounded-2xl border border-[#D1D6DB] bg-[#F7F8FA] shadow-[0_12px_48px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E8EBED] bg-white px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" aria-hidden />
          <span className="text-[10px] font-medium text-[#8B95A1]">
            브릭로그 · {DEVICE_LABELS[device]} 샘플
          </span>
        </div>
        <div className="bg-white p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
