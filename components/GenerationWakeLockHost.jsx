"use client";

import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { useContentPipelineState } from "@/context/ContentContext";

/** 작업실 생성·채널 작성 중 화면 절전 방지 */
export default function GenerationWakeLockHost() {
  const { generating, loadingOverlay } = useContentPipelineState();
  const channelBusy =
    generating.blog ||
    generating.place ||
    generating.instagram ||
    generating.image;
  const overlayBusy =
    Boolean(loadingOverlay?.active) && !loadingOverlay?.complete;

  useScreenWakeLock(channelBusy || overlayBusy);
  return null;
}
