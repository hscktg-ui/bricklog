"use client";

import GenerationLoadingOverlay from "@/components/GenerationLoadingOverlay";
import { useContentPipelineState } from "@/context/ContentContext";

/** 생성 오버레이만 구독 — 폼 입력 시 대시보드 전체 리렌더 방지 */
export default function GenerationLoadingOverlayHost() {
  const { loadingOverlay } = useContentPipelineState();
  return (
    <GenerationLoadingOverlay
      active={Boolean(loadingOverlay?.active)}
      channel={loadingOverlay?.channel || "blog"}
      complete={loadingOverlay?.complete}
      stepLabel={loadingOverlay?.stepLabel}
      sensitiveIndustry={loadingOverlay?.sensitiveIndustry}
      startedAt={loadingOverlay?.startedAt}
      estimatedMs={loadingOverlay?.estimatedMs}
    />
  );
}
