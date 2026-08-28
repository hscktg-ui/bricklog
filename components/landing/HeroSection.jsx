"use client";

import {
  LANDING_HERO_DEFAULT,
  LANDING_LOGIN_CTA,
  LANDING_LOGIN_HINT,
  LANDING_PRIMARY_CTA,
  LANDING_PRIMARY_SUB,
  LANDING_SECONDARY_CTA,
} from "@/lib/landing/ctaCopy";
import { BRICLOG_SLOGAN } from "@/lib/brand/copy";
import {
  VISION_CTA_ACCENT,
  VISION_CTA_GHOST,
  VISION_EYEBROW,
  VISION_HEADLINE,
  VISION_LOGIN_LINK,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

export default function HeroSection({ onSample, onTest, onStart, onLogin }) {
  const headline = LANDING_HERO_DEFAULT.headline;
  const headlineBreak = LANDING_HERO_DEFAULT.headlineBreak;
  const sub = LANDING_HERO_DEFAULT.sub;

  return (
    <section className="briclog-vision-hero relative px-5 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
      <div className="relative mx-auto max-w-3xl text-center">
        <p className={`${VISION_EYEBROW} briclog-vision-stagger briclog-vision-stagger-1`}>
          {BRICLOG_SLOGAN}
        </p>

        <h1
          className={`${VISION_HEADLINE} mt-5 briclog-vision-stagger briclog-vision-stagger-2 md:mt-7`}
        >
          {headline}
          <span className="mt-1 block text-[var(--vision-muted)]">{headlineBreak}</span>
        </h1>

        <p className={`${VISION_SUB} mx-auto mt-6 max-w-xl briclog-vision-stagger briclog-vision-stagger-3 md:mt-8`}>
          {sub}
        </p>

        <div className="mt-10 briclog-vision-stagger briclog-vision-stagger-4">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <button
              id="landing-hero-cta"
              type="button"
              data-briclog-cta="test"
              onClick={onTest || onStart}
              className={VISION_CTA_ACCENT}
            >
              <span>{LANDING_PRIMARY_CTA}</span>
            </button>
            <button type="button" onClick={onSample} className={VISION_CTA_GHOST}>
              <span>{LANDING_SECONDARY_CTA}</span>
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--vision-muted)]">
            {LANDING_PRIMARY_SUB}
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
