"use client";

import { useEffect, useState } from "react";
import { VISION_CTA_ACCENT } from "@/lib/landing/vision2030Styles";

export default function LandingMobileStickyCta({ onStart, introOpen = false }) {
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

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--vision-line)] bg-[var(--vision-glass)] shadow-[0_-20px_60px_rgba(5,5,6,0.12)] backdrop-blur-2xl transition-opacity duration-300 sm:hidden ${
        introOpen ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="region"
      aria-label="빠른 시작"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-[var(--vision-ink)]">
            한 주제, 채널별 초안
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--vision-muted)]">
            이야기 · 플레이스 · 인스타
          </p>
        </div>
        <button
          type="button"
          data-briclog-cta="start"
          onClick={onStart}
          className={`${VISION_CTA_ACCENT} !min-h-[44px] !w-auto !px-5 !py-2.5 !text-[13px]`}
        >
          무료 테스트
        </button>
      </div>
    </div>
  );
}
