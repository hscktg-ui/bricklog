"use client";

import { DEFAULT_SEASON_THEME } from "@/lib/landing/seasonTheme";
import {
  LANDING_HERO_DEFAULT,
} from "@/lib/landing/ctaCopy";
import {
  VISION_CTA_ACCENT,
  VISION_CTA_GHOST,
  VISION_EYEBROW,
  VISION_HEADLINE,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const CHANNELS = ["이야기", "플레이스", "인스타"];

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
    <section className="briclog-vision-hero relative overflow-hidden px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background: `radial-gradient(60% 50% at 80% 20%, ${heroTheme.blobPrimary}, transparent),
            radial-gradient(50% 40% at 10% 80%, ${heroTheme.blobSecondary}, transparent)`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center briclog-vision-reveal">
        <p className={VISION_EYEBROW}>브릭로그 · 브랜드 글쓰기</p>

        <h1
          className={`${VISION_HEADLINE} mt-6`}
          suppressHydrationWarning
        >
          {headline}
          <span className="block text-[var(--vision-muted)]">{headlineBreak}</span>
        </h1>

        <p
          className={`${VISION_SUB} mx-auto mt-6 max-w-xl`}
          suppressHydrationWarning
        >
          {sub}
        </p>

        {seasonBadge ? (
          <p className="mt-4 text-[13px] font-medium text-[var(--vision-muted)]">
            {seasonBadge}
          </p>
        ) : null}

        <div className="mx-auto mt-10 max-w-md text-left">
          <div className="rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] p-5 shadow-[var(--vision-shadow-soft)] backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-muted)]">
              오늘의 한 줄
            </p>
            <p
              className="mt-2 text-[18px] font-medium leading-snug tracking-tight text-[var(--vision-ink)] line-clamp-3"
              suppressHydrationWarning
            >
              {ideaText}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CHANNELS.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-panel-bg,rgba(255,255,255,0.9))] px-3 py-1 text-[11px] font-semibold text-[var(--vision-ink)] lg:bg-[var(--vision-ink)] lg:text-white lg:border-transparent"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            id="landing-hero-cta"
            type="button"
            data-briclog-cta="test"
            onClick={onTest || onStart}
            className={VISION_CTA_ACCENT}
          >
            <span>내 브랜드 테스트하기</span>
          </button>
          <button
            type="button"
            onClick={onSample}
            className={VISION_CTA_GHOST}
          >
            <span>샘플 보기</span>
          </button>
        </div>
      </div>
    </section>
  );
}
