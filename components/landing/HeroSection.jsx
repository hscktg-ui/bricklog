"use client";

import { DEFAULT_SEASON_THEME } from "@/lib/landing/seasonTheme";
import {
  LANDING_HERO_DEFAULT,
  LANDING_LOGIN_CTA,
  LANDING_LOGIN_HINT,
  LANDING_PRIMARY_CTA,
  LANDING_PRIMARY_SUB,
  LANDING_SECONDARY_CTA,
} from "@/lib/landing/ctaCopy";
import LandingTrustStrip from "@/components/landing/LandingTrustStrip";
import { BRICLOG_SLOGAN } from "@/lib/brand/copy";
import {
  VISION_CTA_ACCENT,
  VISION_CTA_GHOST_SUBTLE,
  VISION_EYEBROW,
  VISION_HEADLINE,
  VISION_LOGIN_LINK,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

const CHANNELS = ["이야기", "플레이스", "인스타", "상세"];

export default function HeroSection({
  greeting,
  seasonCopy,
  theme,
  contentIdea,
  onStart,
  onSample,
  onTest,
  onLogin,
}) {
  const heroTheme = theme ?? DEFAULT_SEASON_THEME;
  const headline = greeting?.headline ?? LANDING_HERO_DEFAULT.headline;
  const headlineBreak =
    greeting?.headlineBreak ?? LANDING_HERO_DEFAULT.headlineBreak;
  const sub = greeting?.sub ?? LANDING_HERO_DEFAULT.sub;
  const seasonBadge = seasonCopy?.badge ?? heroTheme.label;
  const ideaText = contentIdea?.text ?? LANDING_HERO_DEFAULT.ideaFallback;

  return (
    <section className="briclog-vision-hero relative overflow-hidden px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(55% 45% at 85% 15%, ${heroTheme.blobPrimary}, transparent),
            radial-gradient(45% 35% at 8% 85%, ${heroTheme.blobSecondary}, transparent)`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className={`${VISION_EYEBROW} briclog-vision-stagger briclog-vision-stagger-1`}>
          {BRICLOG_SLOGAN}
        </p>

        <h1
          className={`${VISION_HEADLINE} mt-5 briclog-vision-stagger briclog-vision-stagger-2 md:mt-7`}
          suppressHydrationWarning
        >
          {headline}
          <span className="mt-1 block bg-gradient-to-r from-[var(--vision-ink)] via-[var(--vision-accent-deep,#03a94d)] to-[var(--vision-ink)] bg-clip-text text-transparent">
            {headlineBreak}
          </span>
        </h1>

        <p
          className={`${VISION_SUB} mx-auto mt-6 max-w-xl briclog-vision-stagger briclog-vision-stagger-3 md:mt-8`}
          suppressHydrationWarning
        >
          {sub}
        </p>

        {seasonBadge ? (
          <p className="mt-4 hidden text-[13px] font-medium text-[var(--vision-muted)] briclog-vision-stagger briclog-vision-stagger-3 sm:block">
            {seasonBadge}
          </p>
        ) : null}

        <div className="mx-auto mt-8 max-w-md text-left briclog-vision-stagger briclog-vision-stagger-4 md:mt-12 lg:mt-12">
          <div className="briclog-vision-glass-card rounded-[1.75rem] p-6 shadow-[var(--vision-shadow-panel)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--vision-muted)]">
              오늘의 한 줄
            </p>
            <p
              className="mt-3 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[var(--vision-ink)] line-clamp-3 md:text-[22px]"
              suppressHydrationWarning
            >
              {ideaText}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="지원 채널">
              {CHANNELS.map((label) => (
                <li key={label}>
                  <span className="inline-block rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-accent-soft)] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--vision-ink)] lg:border-transparent lg:bg-[var(--vision-chip-active-bg,var(--vision-ink))] lg:text-[var(--vision-chip-active-fg,#fff)]">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <LandingTrustStrip className="mt-8 hidden briclog-vision-stagger briclog-vision-stagger-5 lg:flex" />

        <div className="mt-8 briclog-vision-stagger briclog-vision-stagger-5">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <button
              id="landing-hero-cta"
              type="button"
              data-briclog-cta="test"
              onClick={onTest || onStart}
              className={`${VISION_CTA_ACCENT} briclog-vision-cta-glow`}
            >
              <span>{LANDING_PRIMARY_CTA}</span>
            </button>
            <button type="button" onClick={onSample} className={VISION_CTA_GHOST_SUBTLE}>
              <span>{LANDING_SECONDARY_CTA}</span>
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--vision-muted)]">
            {LANDING_PRIMARY_SUB}
          </p>
          <p className="mt-2 text-[13px] text-[var(--vision-muted)]">
            상품 화면이 필요하면{" "}
            <a
              href="/detail"
              className={`${VISION_LOGIN_LINK} !min-h-0 !px-1 !py-0 !text-[13px]`}
            >
              {DETAIL_PAGE_PRODUCT.ctaLabel}
            </a>
          </p>
          {onLogin ? (
            <p className="mt-2 text-[13px] text-[var(--vision-muted)]">
              {LANDING_LOGIN_HINT}{" "}
              <button
                type="button"
                data-briclog-cta="login-hero"
                onClick={onLogin}
                className={`${VISION_LOGIN_LINK} !min-h-0 !px-1 !py-0 !text-[13px]`}
              >
                {LANDING_LOGIN_CTA}
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
