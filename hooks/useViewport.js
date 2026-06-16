"use client";

import { useEffect, useState } from "react";

const MD = "(min-width: 768px)";
const LG = "(min-width: 1024px)";

function readViewport() {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isDesktop: true, width: 1024 };
  }
  const width = window.innerWidth;
  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

function sameBucket(a, b) {
  return (
    a.isMobile === b.isMobile &&
    a.isTablet === b.isTablet &&
    a.isDesktop === b.isDesktop
  );
}

/**
 * Tailwind breakpoints — mobile &lt;768, tablet 768–1023, desktop ≥1024.
 * 모바일 주소창·키보드 resize 시 버킷이 같으면 state를 유지해 랜딩·가입 UI 깜빡임 방지.
 */
export function useViewport() {
  const [vp, setVp] = useState(readViewport);

  useEffect(() => {
    const syncBucket = () => {
      const next = readViewport();
      setVp((prev) => (sameBucket(prev, next) ? prev : next));
    };

    syncBucket();
    const mdMq = window.matchMedia(MD);
    const lgMq = window.matchMedia(LG);
    mdMq.addEventListener("change", syncBucket);
    lgMq.addEventListener("change", syncBucket);

    let raf = 0;
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const width = window.innerWidth;
        if (Math.abs(width - lastWidth) < 2) return;
        lastWidth = width;
        const next = readViewport();
        setVp((prev) => {
          if (!sameBucket(prev, next)) return next;
          if (next.isMobile) return prev;
          if (Math.abs(prev.width - next.width) >= 32) return next;
          return prev;
        });
      });
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      mdMq.removeEventListener("change", syncBucket);
      lgMq.removeEventListener("change", syncBucket);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return vp;
}
