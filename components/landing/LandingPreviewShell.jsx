"use client";

import { useLandingPreview } from "./LandingPreviewContext";

/** 비로그인 랜딩 본문 — PC에서 기기 미리보기 시 너비만 조정 (실제 모바일은 그대로) */
export default function LandingPreviewShell({ children, className = "" }) {
  const { preview, simulating, maxWidth } = useLandingPreview();

  return (
    <div
      className={`@container mx-auto w-full transition-[max-width] duration-300 ease-out ${
        simulating ? "shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : ""
      } ${className}`}
      style={maxWidth ? { maxWidth } : undefined}
      data-landing-preview={preview}
    >
      {children}
    </div>
  );
}
