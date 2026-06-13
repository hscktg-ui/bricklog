"use client";

import { useEffect, useState } from "react";

const CHANNELS = ["이야기", "플레이스", "인스타"];

/**
 * 모바일 랜딩 — 히어로 CTA가 화면 밖으로 나갈 때만 하단에 한 줄 액션
 * (상단·히어로·하단 고정바 중복 제거)
 */
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
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#E8EBED]/90 bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md transition-opacity duration-300 sm:hidden ${
        introOpen ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="region"
      aria-label="빠른 시작"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-[#191F28]">
            한 주제, 채널별 초안
          </p>
          <p className="mt-0.5 flex flex-wrap gap-1">
            {CHANNELS.map((label) => (
              <span
                key={label}
                className="rounded-full bg-[#F0FFF5] px-1.5 py-0.5 text-[10px] font-medium text-[#03A94D]"
              >
                {label}
              </span>
            ))}
          </p>
        </div>
        <button
          type="button"
          data-briclog-cta="start"
          onClick={onStart}
          className="shrink-0 rounded-xl bg-[#03C75A] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm active:brightness-95"
        >
          무료 테스트
        </button>
      </div>
    </div>
  );
}
