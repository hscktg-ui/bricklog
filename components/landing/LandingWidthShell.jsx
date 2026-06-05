"use client";

import DevicePreviewViewport from "@/components/workspace/DevicePreviewViewport";
import { useLandingPreview } from "./LandingPreviewContext";

/**
 * 로그인 폼 — 선택한 기기 너비로 감싸 레이아웃 미리보기
 */
export default function LandingWidthShell({ children, className = "" }) {
  const { preview, native, simulating } = useLandingPreview();

  return (
    <DevicePreviewViewport
      preview={preview}
      native={native}
      simulating={simulating}
      dataAttribute="data-landing-preview"
      className={className}
    >
      {children}
    </DevicePreviewViewport>
  );
}
