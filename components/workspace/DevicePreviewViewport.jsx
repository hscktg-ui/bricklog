"use client";

/**
 * @deprecated Vision 2030 — 네이티브 뷰포트만 사용. children을 그대로 렌더합니다.
 */
export default function DevicePreviewViewport({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}
