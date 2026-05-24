"use client";

import { useEffect } from "react";
import { useViewport } from "@/hooks/useViewport";

/** 모바일·태블릿(<1024px) 사이드 드로어: 스크롤 잠금, Esc 닫기, 데스크톱 전환 시 자동 닫기 */
export function useMobileSidebar(mobileOpen, setMobileOpen) {
  const { isDesktop } = useViewport();

  useEffect(() => {
    if (isDesktop && mobileOpen) setMobileOpen(false);
  }, [isDesktop, mobileOpen, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen || isDesktop) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, isDesktop]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);
}
