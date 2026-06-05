"use client";

import { useViewport } from "@/hooks/useViewport";

/** 모바일(<768px) 글쓰기 화면 — 입력·결과·로딩 간소화 */
export function useMobileWriteUx() {
  const { isMobile } = useViewport();
  return {
    isMobileWrite: isMobile,
    /** 세부 설정·조사 패널·채널팩 등 숨김 */
    simplifyUi: isMobile,
    /** 하단 탭·고정 CTA 여백 */
    formScrollPadClass:
      "max-lg:pb-[calc(5.5rem+var(--workspace-mobile-nav-h,0px)+env(safe-area-inset-bottom,0px))]",
    resultScrollPadClass:
      "max-lg:pb-[calc(var(--workspace-mobile-nav-h,3.5rem)+env(safe-area-inset-bottom,0px)+0.5rem)]",
  };
}
