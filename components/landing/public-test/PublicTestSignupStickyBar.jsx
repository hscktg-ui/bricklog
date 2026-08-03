"use client";

import {
  PUBLIC_TEST_STICKY_SIGNUP_CTA,
  PUBLIC_TEST_STICKY_SIGNUP_HEADLINE,
} from "@/lib/brand/copy";
import { VISION_CTA_ACCENT } from "@/lib/landing/vision2030Styles";

/** 샘플 결과·쿼터·오류 열람 중 하단 고정 가입 CTA — 모바일·데스크톱 공통 */
export default function PublicTestSignupStickyBar({ brandName, onSignup, tone = "result" }) {
  if (!onSignup) return null;
  const brand = brandName?.trim() || "";
  const headline = brand
    ? `「${brand}」 ${PUBLIC_TEST_STICKY_SIGNUP_HEADLINE}`
    : PUBLIC_TEST_STICKY_SIGNUP_HEADLINE;
  const cta =
    tone === "quota"
      ? "무료로 가입 · 이번 달 운영 이어가기"
      : tone === "error"
        ? brand
          ? `「${brand}」 작업실에서 무료로 이어가기`
          : "무료로 가입하고 작업실에서 다시 쓰기"
        : PUBLIC_TEST_STICKY_SIGNUP_CTA;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[38] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      role="region"
      aria-label="작업실 만들기"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] p-3 shadow-[var(--vision-shadow-panel)] backdrop-blur-xl">
        <p className="mb-2 text-center text-[12px] font-semibold leading-snug text-[var(--vision-ink)]">
          {headline}
        </p>
        <button
          type="button"
          data-briclog-cta="signup-sticky"
          onClick={onSignup}
          className={`${VISION_CTA_ACCENT} w-full !min-h-[48px] !text-[14px]`}
        >
          <span>{cta}</span>
        </button>
      </div>
    </div>
  );
}
