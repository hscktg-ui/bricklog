"use client";

import { DEFAULT_SEASON_THEME } from "@/lib/landing/seasonTheme";
import {
  LANDING_HERO_DEFAULT,
  LANDING_HERO_MOBILE_TRUST,
} from "@/lib/landing/ctaCopy";
import {
  GREEN_CTA_OUTLINE,
  GREEN_CTA_SOLID,
} from "@/lib/ui/actionButtonStyles";

export default function HeroSection({
  greeting,
  seasonCopy,
  theme,
  contentIdea,
  onStart,
  onSample,
  onTest,
}) {
  const heroTheme = theme ?? DEFAULT_SEASON_THEME;
  const headline = greeting?.headline ?? LANDING_HERO_DEFAULT.headline;
  const headlineBreak =
    greeting?.headlineBreak ?? LANDING_HERO_DEFAULT.headlineBreak;
  const sub = greeting?.sub ?? LANDING_HERO_DEFAULT.sub;
  const seasonBadge = seasonCopy?.badge ?? heroTheme.label;
  const ideaText = contentIdea?.text ?? LANDING_HERO_DEFAULT.ideaFallback;

  return (
    <section
      className="relative overflow-hidden px-5 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12"
      style={{ background: heroTheme.heroGradient }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: heroTheme.blobPrimary }}
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-[#03A94D]">
          브릭로그
        </p>

        <ul className="mx-auto mt-4 flex justify-center gap-2">
          {LANDING_HERO_MOBILE_TRUST.map((line) => (
            <li
              key={line}
              className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#4E5968] ring-1 ring-[#E8EBED]"
            >
              {line}
            </li>
          ))}
        </ul>

        <h1
          className="mt-6 text-[28px] font-bold leading-[1.22] tracking-tight text-[#191F28] sm:text-[34px] md:text-[42px]"
          suppressHydrationWarning
        >
          {headline}
          <br />
          {headlineBreak}
        </h1>
        <p
          className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-[#4E5968] sm:max-w-md sm:text-[16px]"
          suppressHydrationWarning
        >
          {sub}
        </p>

        {seasonBadge ? (
          <p className="mt-3 text-[12px] text-[#8B95A1]">{seasonBadge}</p>
        ) : null}

        <p className="mt-5 text-[13px] font-medium tracking-wide text-[#8B95A1]">
          이야기 · 플레이스 · 인스타
        </p>

        <div
          className="mx-auto mt-5 max-w-sm rounded-2xl border border-[#E8EBED]/80 bg-white/95 px-4 py-3.5 text-left shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm"
          suppressHydrationWarning
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#03A94D]">
            오늘의 한 줄
          </p>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-[#191F28] line-clamp-2">
            {ideaText}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-3">
          <button
            id="landing-hero-cta"
            type="button"
            data-briclog-cta="test"
            onClick={onTest || onStart}
            className={`w-full sm:w-auto sm:min-w-[260px] ${GREEN_CTA_SOLID} min-h-[52px]! text-[16px]! shadow-[0_4px_20px_rgba(3,199,90,0.25)]`}
          >
            <span>내 브랜드 테스트하기</span>
          </button>
          <button
            type="button"
            onClick={onSample}
            className={`w-full sm:w-auto ${GREEN_CTA_OUTLINE} min-h-[48px]!`}
          >
            <span>샘플 보기</span>
          </button>
        </div>
      </div>
    </section>
  );
}
