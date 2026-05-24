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
  DEVICE_LABELS,
  nextPreviewDevice,
} from "@/lib/workspace/devicePreviewCycle";

/**
 * 도움말 FAB 위 — 아이콘만 탭하여 모바일·태블릿·PC 미리보기 전환
 */
export default function WorkspaceDevicePreviewToggle() {
  const { preview, native, simulating, cycle } = useWorkspacePreview();
  const next = nextPreviewDevice(preview);
  const bottom = assistFabBottom("workspace");

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${DEVICE_LABELS[preview]} 화면 · 다음 ${DEVICE_LABELS[next]}`}
      aria-label={`화면 크기 ${DEVICE_LABELS[preview]}. 누르면 ${DEVICE_LABELS[next]}로 바뀝니다`}
      className={`fixed z-[90] cursor-pointer ${ASSIST_FAB_SIZE} ${ASSIST_FAB_SHELL} ${ASSIST_FAB_SIDE} ${
        simulating ? ASSIST_FAB_ACTIVE : ASSIST_FAB_IDLE
      } ${bottom.device}`}
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
