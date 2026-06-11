"use client";

import SketchDeviceIcon from "@/components/icons/SketchDeviceIcon";
import { useLandingPreview } from "./LandingPreviewContext";
import {
  ASSIST_FAB_ACTIVE,
  ASSIST_FAB_IDLE,
  ASSIST_FAB_SHELL,
  ASSIST_FAB_SIDE,
  ASSIST_FAB_SIZE,
  assistFabBottom,
} from "@/lib/ui/assistFabLayout";
import {
  DEVICE_EMOJI,
  DEVICE_TAB_SHORT,
  deviceCycleAriaLabel,
} from "@/lib/workspace/devicePreviewCopy";
import { nextPreviewDevice } from "@/lib/workspace/devicePreviewCycle";

/**
 * 비로그인 랜딩 — 도움말 FAB 위 (워크스페이스와 동일)
 */
export default function LandingDevicePreviewToggle({ className = "" }) {
  const { preview, native, simulating, cyclePreview } = useLandingPreview();
  const next = nextPreviewDevice(preview);
  const bottom = assistFabBottom("landing");

  return (
    <button
      type="button"
      onClick={cyclePreview}
      title={`${DEVICE_EMOJI[preview]} ${DEVICE_TAB_SHORT[preview]} · 다음 ${DEVICE_TAB_SHORT[next]}`}
      aria-label={deviceCycleAriaLabel(preview, next)}
      className={`fixed z-[90] ${ASSIST_FAB_SIZE} ${ASSIST_FAB_SHELL} ${ASSIST_FAB_SIDE} ${
        simulating ? ASSIST_FAB_ACTIVE : ASSIST_FAB_IDLE
      } ${bottom.device} ${className}`}
    >
      <span className="relative inline-flex items-center justify-center">
        <SketchDeviceIcon
          device={preview}
          active={simulating}
          className="h-6 w-6 sm:h-7 sm:w-7"
        />
        <span
          className="absolute -right-1 -top-1 text-[11px] leading-none"
          aria-hidden
        >
          {DEVICE_EMOJI[preview]}
        </span>
      </span>
      {native !== preview ? (
        <span className="sr-only">
          실제 기기는 {DEVICE_TAB_SHORT[native]}
        </span>
      ) : null}
    </button>
  );
}
