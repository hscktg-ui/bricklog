"use client";

import {
  PUBLIC_TEST_STICKY_SIGNUP_CTA,
  PUBLIC_TEST_STICKY_SIGNUP_HEADLINE,
} from "@/lib/brand/copy";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
} from "@/lib/landing/vision2030Styles";

/**
 * 샘플 결과 열람 중 하단 고정 가입 CTA — Vision 2030 glass bar
 */
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
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] p-3 shadow-[var(--vision-shadow-panel)] backdrop-blur-xl sm:max-w-2xl sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className={VISION_EYEBROW}>브랜드 작업실</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-[var(--vision-ink)] sm:text-[14px]">
            {label}
          </p>
        </div>
        <button
          type="button"
          data-briclog-cta="signup-sticky"
          onClick={onSignup}
          className={`${VISION_CTA_ACCENT} !min-h-[44px] !w-auto shrink-0 !px-5 !py-2.5 !text-[13px] sm:!min-h-[48px] sm:!px-6`}
        >
          <span>{PUBLIC_TEST_STICKY_SIGNUP_CTA}</span>
        </button>
      </div>
    </div>
  );
}
