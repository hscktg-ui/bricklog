"use client";

import DevicePreviewViewport from "@/components/workspace/DevicePreviewViewport";
import { useLandingPreview } from "./LandingPreviewContext";

/** 비로그인 랜딩 본문 — 기기 미리보기 (모바일에서 PC·태블릿도 스케일로 표시) */
export default function LandingPreviewShell({ children, className = "" }) {
  const { preview, native, simulating } = useLandingPreview();

  return (
    <DevicePreviewViewport
      preview={preview}
      native={native}
      simulating={simulating}
      dataAttribute="data-landing-preview"
      className={`@container ${className}`}
    >
      {children}
    </DevicePreviewViewport>
  );
}
