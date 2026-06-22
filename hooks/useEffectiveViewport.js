"use client";

import { nativeDeviceFromViewport } from "@/lib/workspace/devicePreviewCycle";
import { useViewport } from "@/hooks/useViewport";

/** 실제 뷰포트만 — 기기 시뮬레이션 없음 */
export function useEffectiveViewport() {
  const real = useViewport();
  const native = nativeDeviceFromViewport(real);
  return {
    ...real,
    simulating: false,
    preview: native,
    native,
  };
}
