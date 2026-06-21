"use client";

import { useEffect, useState } from "react";
import { LANDING_PRIMARY_CTA } from "@/lib/landing/ctaCopy";
import { VISION_CTA_ACCENT } from "@/lib/landing/vision2030Styles";

/** 모바일·태블릿 — 히어로 CTA 이탈 시 단일 액션만 (Vision 2030: 한 가지 선택) */
export default function LandingMobileStickyCta({
  onStart,
  introOpen = false,
  suppressed = false,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("landing-hero-cta");
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible || suppressed) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--vision-line)] bg-[var(--vision-glass)] shadow-[0_-20px_60px_rgba(5,5,6,0.12)] backdrop-blur-2xl transition-opacity duration-300 lg:hidden ${
        introOpen ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="region"
      aria-label="빠른 시작"
    >
      <div className="mx-auto max-w-lg px-4 py-3">
        <button
          type="button"
          data-briclog-cta="start"
          onClick={onStart}
          className={`${VISION_CTA_ACCENT} w-full !min-h-[48px] !text-[14px]`}
        >
          {LANDING_PRIMARY_CTA}
        </button>
      </div>
    </div>
  );
}
