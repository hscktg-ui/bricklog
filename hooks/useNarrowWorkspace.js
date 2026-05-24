"use client";

import { useViewport } from "@/hooks/useViewport";

/** 모바일·태블릿 — PC(1024px~)와 구분하는 작업 화면 폭 */
export function useNarrowWorkspace() {
  const { isDesktop } = useViewport();
  return { narrow: !isDesktop };
}
