"use client";

import { useLandingPreviewOptional } from "@/components/landing/LandingPreviewContext";
import { useWorkspacePreviewOptional } from "@/context/WorkspacePreviewContext";
import {
  DEVICE_WIDTHS,
  layoutForDevice,
} from "@/lib/workspace/devicePreviewLayout";
import { useViewport } from "@/hooks/useViewport";

/**
 * 실제 뷰포트 + 기기 미리보기(시뮬레이션)를 합친 레이아웃
 */
export function useEffectiveViewport() {
  const real = useViewport();
  const landing = useLandingPreviewOptional();
  const workspace = useWorkspacePreviewOptional();
  const ctx = workspace || landing;

  if (!ctx?.simulating) {
    return { ...real, simulating: false, preview: ctx?.preview ?? null };
  }

  const layout = layoutForDevice(ctx.preview);
  return {
    width: DEVICE_WIDTHS[ctx.preview],
    ...layout,
    simulating: true,
    preview: ctx.preview,
    native: ctx.native,
  };
}
