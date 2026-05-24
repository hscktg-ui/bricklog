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

/** Tailwind-aligned breakpoints: mobile &lt;768, tablet 768–1023, desktop ≥1024 */
export function useViewport() {
  const [vp, setVp] = useState(readViewport);

  useEffect(() => {
    const update = () => setVp(readViewport());
    update();
    const mdMq = window.matchMedia(MD);
    const lgMq = window.matchMedia(LG);
    mdMq.addEventListener("change", update);
    lgMq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mdMq.removeEventListener("change", update);
      lgMq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return vp;
}
