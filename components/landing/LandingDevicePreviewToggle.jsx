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
  DEVICE_LABELS,
  nextPreviewDevice,
} from "@/lib/workspace/devicePreviewCycle";

/**
 * 비로그인 랜딩 — 도움말 FAB 위 (로그인 워크스페이스와 동일 크기·색)
 */
export default function LandingDevicePreviewToggle({ className = "" }) {
  const { preview, native, simulating, cyclePreview } = useLandingPreview();
  const next = nextPreviewDevice(preview);
  const bottom = assistFabBottom("landing");

  return (
    <button
      type="button"
      onClick={cyclePreview}
      title={`${DEVICE_LABELS[preview]} 화면 · 다음 ${DEVICE_LABELS[next]}`}
      aria-label={`화면 크기 ${DEVICE_LABELS[preview]}. 누르면 ${DEVICE_LABELS[next]}로 바뀝니다`}
      className={`fixed z-[90] ${ASSIST_FAB_SIZE} ${ASSIST_FAB_SHELL} ${ASSIST_FAB_SIDE} ${
        simulating ? ASSIST_FAB_ACTIVE : ASSIST_FAB_IDLE
      } ${bottom.device} ${className}`}
    >
      <SketchDeviceIcon
        device={preview}
        active={simulating}
        className="h-6 w-6 sm:h-7 sm:w-7"
      />
      {native !== preview ? (
        <span className="sr-only">
          실제 기기는 {DEVICE_LABELS[native]}
        </span>
      ) : null}
    </button>
  );
}
