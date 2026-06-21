"use client";

import { useEffect, useState } from "react";
import {
  LANDING_LOGIN_CTA,
  LANDING_NAV_START_CTA,
} from "@/lib/landing/ctaCopy";
import {
  VISION_CTA_ACCENT,
  VISION_LOGIN_LINK,
} from "@/lib/landing/vision2030Styles";

/** 모바일·태블릿 — accent 시작 + 로그인 텍스트 (Jobs: 한 결정 + 기존 회원) */
export default function LandingMobileStickyCta({
  onStart,
  onLogin,
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
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
        <button
          type="button"
          data-briclog-cta="start"
          onClick={onStart}
          className={`${VISION_CTA_ACCENT} min-w-0 flex-1 !min-h-[48px] !text-[14px]`}
        >
          {LANDING_NAV_START_CTA}
        </button>
        {onLogin ? (
          <button
            type="button"
            data-briclog-cta="login-sticky"
            onClick={onLogin}
            className={`${VISION_LOGIN_LINK} !min-h-[48px]`}
          >
            {LANDING_LOGIN_CTA}
          </button>
        ) : null}
      </div>
    </div>
  );
}
