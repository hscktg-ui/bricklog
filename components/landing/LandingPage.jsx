"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  hasPlayedLandingSignature,
  markLandingIntroDone,
  markLandingSignaturePlayed,
  shouldShowLandingIntro,
} from "@/lib/landing/landingSession";
import Logo from "@/components/Logo";
import LandingIntroOverlay from "@/components/landing/LandingIntroOverlay";
import { useLandingVisit } from "@/lib/landing/useLandingVisit";
import BgmToggle from "@/components/audio/BgmToggle";
import {
  unlockAudioFromUserGesture,
  playSignatureSound,
} from "@/lib/audio/briclogSounds";
import { maybeStartBgmAfterGestureUnlock } from "@/lib/audio/briclogBgm";
import LandingPreviewShell from "./LandingPreviewShell";
import HeroSection from "./HeroSection";
import LiveStatsBanner from "./LiveStatsBanner";
import DemoFlow from "./DemoFlow";
import DemoPreviewSection from "./DemoPreviewSection";
import ChannelPreview from "./ChannelPreview";
import WorkflowSection from "./WorkflowSection";
import WhyBriclog from "./WhyBriclog";
import CoreEngineSection from "./CoreEngineSection";
import PricingSection from "./PricingSection";
import {
  LANDING_CTA_FOOTNOTE,
  LANDING_CTA_HEADLINE,
  LANDING_CTA_PHILOSOPHY,
  LANDING_CTA_SUB,
} from "@/lib/landing/ctaCopy";
import LandingMobileStickyCta from "@/components/landing/LandingMobileStickyCta";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import {
  VISION_CTA_ACCENT,
  VISION_NAV,
  VISION_NAV_INNER,
  VISION_PAGE,
  VISION_SECTION_DARK,
} from "@/lib/landing/vision2030Styles";

export default function LandingPage({ onAuthOpen, onStart }) {
  const { greeting, sample, contentIdea, seasonCopy, theme } =
    useLandingVisit();
  const [introOpen, setIntroOpen] = useState(false);

  const scrollToPublicTest = useCallback(() => {
    document
      .getElementById("public-brand-test")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("intro") === "reset") {
      sessionStorage.removeItem("briclog-intro-session-done");
      const url = new URL(window.location.href);
      url.searchParams.delete("intro");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    setIntroOpen(shouldShowLandingIntro());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromAds =
      params.get("test") === "1" ||
      params.get("utm_source") === "instagram" ||
      params.get("utm_medium") === "paid_social";
    if (!fromAds) return;
    const t = window.setTimeout(() => scrollToPublicTest(), introOpen ? 800 : 120);
    return () => window.clearTimeout(t);
  }, [introOpen, scrollToPublicTest]);

  const withLandingCta = useCallback(
    (fn) => () => {
      unlockAudioFromUserGesture();
      void maybeStartBgmAfterGestureUnlock();
      if (!hasPlayedLandingSignature()) {
        markLandingSignaturePlayed();
        void playSignatureSound();
      }
      fn?.();
    },
    []
  );

  const handleStart = withLandingCta(onStart);

  const scrollToSample = () => {
    document
      .getElementById("landing-sample")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleIntroDismiss = useCallback(() => {
    markLandingIntroDone();
    setIntroOpen(false);
    unlockAudioFromUserGesture();
    void maybeStartBgmAfterGestureUnlock();
    if (!hasPlayedLandingSignature()) {
      markLandingSignaturePlayed();
      void playSignatureSound();
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  return (
    <div className={`${VISION_PAGE} [--landing-cta-h:3.75rem]`}>
      <LandingIntroOverlay
        open={introOpen}
        onDismiss={handleIntroDismiss}
        onSkip={handleIntroDismiss}
      />

      <header
        className={`${VISION_NAV} transition-opacity duration-500 ${
          introOpen ? "pointer-events-none opacity-0" : "opacity-100 briclog-vision-reveal"
        }`}
      >
        <div className={VISION_NAV_INNER}>
          <Logo />
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <BgmToggle
              fullWidth={false}
              className="hidden shrink-0 !rounded-full !border-[var(--vision-line)] !bg-[var(--vision-panel-bg,rgba(255,255,255,0.8))] sm:flex"
            />
            <button
              type="button"
              onClick={() => onAuthOpen("login")}
              className="rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--vision-muted)] transition hover:bg-[var(--vision-panel-bg,rgba(0,0,0,0.05))] hover:text-[var(--vision-ink)]"
            >
              로그인
            </button>
            <button
              type="button"
              data-briclog-cta="start"
              onClick={withLandingCta(scrollToPublicTest)}
              className="hidden rounded-full bg-[var(--vision-accent)] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(3,199,90,0.28)] sm:inline-flex sm:text-[13px]"
            >
              <span>무료 샘플</span>
            </button>
          </nav>
        </div>
      </header>

      <LandingPreviewShell>
        <main
          id="landing-main"
          className={`pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0 ${
            introOpen ? "pointer-events-none opacity-0" : "briclog-vision-reveal"
          }`}
        >
          <HeroSection
            greeting={greeting}
            seasonCopy={seasonCopy}
            theme={theme}
            contentIdea={contentIdea}
            onStart={handleStart}
            onSample={withLandingCta(scrollToSample)}
            onTest={withLandingCta(scrollToPublicTest)}
          />
          <PublicBrandTestSection onSignup={(mode) => onAuthOpen(mode || "signup")} />
          <LiveStatsBanner introOpen={introOpen} />
          <DemoPreviewSection sample={sample} />
          <details className="group border-t border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]">
            <summary className="mx-auto flex max-w-6xl cursor-pointer list-none items-center justify-between gap-3 px-5 py-6 text-[15px] font-semibold text-[var(--vision-ink)] marker:content-none md:px-8 [&::-webkit-details-marker]:hidden">
              <span>브릭로그가 어떻게 돌아가는지 더 보기</span>
              <svg
                className="h-5 w-5 shrink-0 text-[var(--vision-muted)] transition-transform duration-300 group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className="border-t border-[var(--vision-line)] bg-[var(--vision-paper)]">
              <DemoFlow sample={sample} />
              <ChannelPreview sample={sample} />
              <WorkflowSection />
              <CoreEngineSection />
              <WhyBriclog />
            </div>
          </details>
          <PricingSection onStart={handleStart} />

          <section
            className={`${VISION_SECTION_DARK} px-5 py-20 text-center md:px-8 md:py-28`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Start here
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-white">
              {LANDING_CTA_HEADLINE}
            </p>
            <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-white/55">
              {LANDING_CTA_SUB}
            </p>
            {LANDING_CTA_PHILOSOPHY ? (
              <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-white/40">
                {LANDING_CTA_PHILOSOPHY}
              </p>
            ) : null}
            <button
              type="button"
              data-briclog-cta="start"
              onClick={withLandingCta(scrollToPublicTest)}
              className={`${VISION_CTA_ACCENT} mt-10`}
            >
              <span>발행 샘플 먼저 보기</span>
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 block w-full text-[14px] font-medium text-white/45 underline-offset-4 hover:text-white/70 hover:underline sm:mx-auto"
            >
              바로 가입하기
            </button>
            <p className="mt-8 text-[12px] text-white/35">{LANDING_CTA_FOOTNOTE}</p>
          </section>
        </main>
      </LandingPreviewShell>

      <LandingMobileStickyCta
        onStart={withLandingCta(scrollToPublicTest)}
        introOpen={introOpen}
      />
    </div>
  );
}
