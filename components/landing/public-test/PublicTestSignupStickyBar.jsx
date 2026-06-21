"use client";

import {
  PUBLIC_TEST_STICKY_SIGNUP_CTA,
  PUBLIC_TEST_STICKY_SIGNUP_HEADLINE,
} from "@/lib/brand/copy";
import { VISION_CTA_ACCENT } from "@/lib/landing/vision2030Styles";

/** 샘플 결과 열람 중 하단 고정 가입 CTA — 모바일 단일 액션 */
export default function PublicTestSignupStickyBar({ brandName, onSignup }) {
  if (!onSignup) return null;
  const label = brandName?.trim()
    ? `「${brandName.trim()}」 ${PUBLIC_TEST_STICKY_SIGNUP_HEADLINE}`
    : PUBLIC_TEST_STICKY_SIGNUP_HEADLINE;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[38] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:hidden"
      role="region"
      aria-label="작업실 만들기"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] p-3 shadow-[var(--vision-shadow-panel)] backdrop-blur-xl">
        <button
          type="button"
          data-briclog-cta="signup-sticky"
          onClick={onSignup}
          className={`${VISION_CTA_ACCENT} w-full !min-h-[48px] !text-[14px]`}
        >
          <span>{PUBLIC_TEST_STICKY_SIGNUP_CTA}</span>
        </button>
        <p className="mt-2 line-clamp-1 text-center text-[11px] font-medium text-[var(--vision-muted)]">
          {label}
        </p>
      </div>
    </div>
  );
}
