"use client";

import SketchDeviceIcon from "@/components/icons/SketchDeviceIcon";
import { useWorkspacePreview } from "@/context/WorkspacePreviewContext";
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
 * 도움말 FAB 위 — 탭으로 폰·패드·PC 미리보기 순환
 */
export default function WorkspaceDevicePreviewToggle({ className = "" }) {
  const { preview, native, simulating, cycle } = useWorkspacePreview();
  const next = nextPreviewDevice(preview);
  const bottom = assistFabBottom("workspace");

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${DEVICE_EMOJI[preview]} ${DEVICE_TAB_SHORT[preview]} · 다음 ${DEVICE_TAB_SHORT[next]}`}
      aria-label={deviceCycleAriaLabel(preview, next)}
      className={`fixed z-[90] cursor-pointer ${ASSIST_FAB_SIZE} ${ASSIST_FAB_SHELL} ${ASSIST_FAB_SIDE} ${
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
