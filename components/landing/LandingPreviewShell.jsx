"use client";

/** 비로그인 랜딩 본문 — 네이티브 뷰포트 (기기 토글 없음) */
export default function LandingPreviewShell({ children, className = "" }) {
  return <div className={`@container ${className}`}>{children}</div>;
}
