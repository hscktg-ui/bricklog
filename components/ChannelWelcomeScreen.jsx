"use client";

import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

/**
 * First-run welcome — one verdict, one CTA (Jobs).
 * Channel picker menu removed; density matches Today scene.
 */
export default function ChannelWelcomeScreen({
  onSelectChannel,
  onSkip,
  brandName = "",
}) {
  const brandLine = brandName?.trim() ? `「${brandName}」` : "브랜드";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper,#FCFCFA)]"
      data-briclog-surface="welcome"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 md:px-10 md:py-16">
        <p className={`${VISION_EYEBROW} text-center`}>Today</p>
        <h1 className="mt-5 text-center text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--vision-ink,#111111)]">
          오늘, {brandLine}의
          <br />
          이야기를 남기세요.
        </h1>
        <p className={`mx-auto mt-5 max-w-md text-center ${VISION_SUB}`}>
          메뉴를 고르지 마세요. 한 문장부터 시작합니다.
        </p>
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => (onSkip ? onSkip() : onSelectChannel("blog"))}
            className={VISION_CTA_ACCENT}
          >
            이야기 쓰기
          </button>
        </div>
      </div>
    </div>
  );
}
