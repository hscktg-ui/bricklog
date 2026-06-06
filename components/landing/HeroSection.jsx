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

const CHANNEL_PILLS = ["이야기", "플레이스", "인스타"];

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
      className="relative overflow-hidden px-4 pb-8 pt-6 md:px-8 md:pb-16 md:pt-10"
      style={{ background: heroTheme.heroGradient }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: heroTheme.blobPrimary }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#03A94D]">
          브릭로그 · BRICLOG
        </p>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          AI 브랜드 글쓰기 · Naver blog · Smart Place · Instagram
        </p>

        <p className="mx-auto mt-3 max-w-xs text-[12px] font-medium text-[#03A94D] sm:hidden">
          {LANDING_HERO_MOBILE_TRUST[0]}
        </p>
        <ul className="mx-auto mt-3 hidden flex-wrap justify-center gap-1.5 sm:flex">
          {LANDING_HERO_MOBILE_TRUST.map((line) => (
            <li
              key={line}
              className="rounded-full border border-[#03C75A]/25 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-[#03A94D]"
            >
              {line}
            </li>
          ))}
        </ul>

        <h1
          className="mt-4 text-[22px] font-bold leading-[1.3] text-[#191F28] sm:text-[30px] md:text-[38px]"
          suppressHydrationWarning
        >
          {headline}
          <br />
          {headlineBreak}
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#4E5968] sm:max-w-xl sm:text-[16px]"
          suppressHydrationWarning
        >
          {sub}
        </p>

        {seasonBadge ? (
          <p className="mt-2 text-[12px] text-[#8B95A1]">{seasonBadge}</p>
        ) : null}

        <div className="mx-auto mt-4 flex flex-wrap justify-center gap-1.5">
          {CHANNEL_PILLS.map((label) => (
            <span
              key={label}
              className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#4E5968] ring-1 ring-[#E8EBED]"
            >
              {label}
            </span>
          ))}
        </div>

        <div
          className="mx-auto mt-5 max-w-md rounded-2xl border border-[#E8EBED] bg-white px-4 py-3 text-left shadow-sm"
          suppressHydrationWarning
        >
          <p className="text-[10px] font-semibold text-[#03A94D]">오늘 쓰기 좋은 주제</p>
          <p className="mt-1 text-[14px] font-medium leading-snug text-[#191F28] line-clamp-2">
            {ideaText}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            id="landing-hero-cta"
            type="button"
            data-briclog-cta="test"
            onClick={onTest || onStart}
            className={`w-full sm:w-auto sm:min-w-[240px] ${GREEN_CTA_SOLID} min-h-[48px]! text-[16px]!`}
          >
            <span>내 브랜드 테스트하기</span>
          </button>
          <button
            type="button"
            onClick={onSample}
            className={`w-full sm:w-auto ${GREEN_CTA_OUTLINE}`}
          >
            <span>샘플 보기</span>
          </button>
        </div>
      </div>
    </section>
  );
}
