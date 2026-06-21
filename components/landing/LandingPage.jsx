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
import {
  areSoundsEnabled,
  playSignatureSound,
  unlockAudioFromUserGesture,
} from "@/lib/audio/briclogSounds";
import { recordSignupIntent } from "@/lib/analytics/signupIntent";
import LandingPreviewShell from "./LandingPreviewShell";
import HeroSection from "./HeroSection";
import LiveStatsBanner from "./LiveStatsBanner";
import DemoPreviewSection from "./DemoPreviewSection";
import ContentPlanSection from "./ContentPlanSection";
import DemoFlow from "./DemoFlow";
import BriclogNextSection from "./BriclogNextSection";
import WhyBriclog from "./WhyBriclog";
import CoreEngineSection from "./CoreEngineSection";
import LandingFaqSection from "./LandingFaqSection";
import LandingPageFooter from "./LandingPageFooter";
import PricingSection from "./PricingSection";
import {
  LANDING_CTA_FOOTNOTE,
  LANDING_CTA_HEADLINE,
  LANDING_CTA_PHILOSOPHY,
  LANDING_CTA_SUB,
  LANDING_NAV_SIGNUP_CTA,
  LANDING_PRIMARY_CTA,
} from "@/lib/landing/ctaCopy";
import LandingMobileStickyCta from "@/components/landing/LandingMobileStickyCta";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_NAV,
  VISION_NAV_INNER,
  VISION_PAGE,
  VISION_SECTION_DARK,
} from "@/lib/landing/vision2030Styles";

const NAV_LINKS = [
  { id: "public-brand-test", label: "무료 테스트", show: "hidden sm:inline-flex" },
  { id: "landing-sample", label: "샘플", show: "hidden lg:inline-flex" },
  { id: "landing-faq", label: "FAQ", show: "hidden xl:inline-flex" },
  { id: "pricing", label: "요금", show: "hidden lg:inline-flex" },
];

export default function LandingPage({ onAuthOpen, onStart }) {
  const { greeting, sample, contentIdea, seasonCopy, theme } =
    useLandingVisit();
  const [introOpen, setIntroOpen] = useState(false);
  const [publicTestPreviewActive, setPublicTestPreviewActive] = useState(false);

  const scrollToId = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPublicTest = useCallback(() => {
    scrollToId("public-brand-test");
  }, [scrollToId]);

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

  const withLandingCta = useCallback((fn) => () => fn?.(), []);

  const handleStart = useCallback(() => onStart?.(), [onStart]);
  const openSignup = useCallback(
    (source = "landing") => {
      recordSignupIntent(source);
      onAuthOpen("signup");
    },
    [onAuthOpen]
  );

  const scrollToSample = () => scrollToId("landing-sample");

  const handleIntroDismiss = useCallback(() => {
    markLandingIntroDone();
    setIntroOpen(false);
    if (areSoundsEnabled() && !hasPlayedLandingSignature()) {
      markLandingSignaturePlayed();
      void unlockAudioFromUserGesture().then(() => playSignatureSound());
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
        <div className={`${VISION_NAV_INNER} !px-3 !py-1.5 sm:!px-4 md:!px-5 md:!py-2.5`}>
          <Logo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          <nav
            className="flex shrink-0 items-center gap-0.5 sm:gap-1"
            aria-label="주요 메뉴"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToId(link.id)}
                className={`${link.show} rounded-full px-2.5 py-2 text-[12px] font-semibold text-[var(--vision-muted)] transition hover:bg-[var(--vision-panel-bg,rgba(0,0,0,0.05))] hover:text-[var(--vision-ink)] lg:px-3 lg:text-[13px]`}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onAuthOpen("login")}
              className="hidden rounded-full px-2.5 py-2 text-[12px] font-semibold text-[var(--vision-muted)] transition hover:bg-[var(--vision-panel-bg,rgba(0,0,0,0.05))] hover:text-[var(--vision-ink)] sm:inline-flex sm:px-3 sm:text-[13px]"
            >
              로그인
            </button>
            <button
              type="button"
              data-briclog-cta="start"
              onClick={withLandingCta(scrollToPublicTest)}
              className={`${VISION_CTA_ACCENT} !min-h-[36px] !w-auto !px-3.5 !py-2 !text-[12px] sm:!min-h-[40px] sm:!px-4 sm:!text-[13px] lg:!min-h-[44px]`}
            >
              <span>{LANDING_PRIMARY_CTA}</span>
            </button>
          </nav>
        </div>
      </header>

      <LandingPreviewShell>
        <main
          id="landing-main"
          className={`pb-[calc(var(--landing-cta-h,3.75rem)+max(1rem,env(safe-area-inset-bottom,0px)))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] ${
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
          <WhyBriclog />
          <ContentPlanSection />
          <div className="hidden lg:block">
            <BriclogNextSection />
          </div>
          <div className="hidden md:block">
            <LiveStatsBanner introOpen={introOpen} />
          </div>
          <PublicBrandTestSection
            onSignup={(mode) => onAuthOpen(mode || "signup")}
            onPreviewActiveChange={setPublicTestPreviewActive}
          />
          <DemoPreviewSection
            sample={sample}
            onTest={withLandingCta(scrollToPublicTest)}
          />
          <DemoFlow sample={sample} />
          <div className="hidden lg:block">
            <CoreEngineSection />
          </div>
          <LandingFaqSection />
          <PricingSection onStart={handleStart} />

          <section
            className={`${VISION_SECTION_DARK} px-5 py-20 text-center md:px-8 md:py-28 briclog-vision-footer-cta`}
          >
            <p className={`${VISION_EYEBROW} text-white/45`}>
              시작하기
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-white">
              {LANDING_CTA_HEADLINE}
            </p>
            <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-white/55">
              {LANDING_CTA_SUB}
            </p>
            {LANDING_CTA_PHILOSOPHY ? (
              <p className="mx-auto mt-4 hidden max-w-xl text-[14px] leading-relaxed text-white/40 md:block">
                {LANDING_CTA_PHILOSOPHY}
              </p>
            ) : null}
            <button
              type="button"
              data-briclog-cta="start"
              onClick={withLandingCta(scrollToPublicTest)}
              className={`${VISION_CTA_ACCENT} mt-10`}
            >
              <span>{LANDING_PRIMARY_CTA}</span>
            </button>
            <button
              type="button"
              data-briclog-cta="signup-footer"
              onClick={() => openSignup("landing_footer")}
              className="mt-5 hidden min-h-[48px] items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 text-[14px] font-semibold text-white/85 transition hover:bg-white/10 active:scale-[0.99] sm:inline-flex"
            >
              {LANDING_NAV_SIGNUP_CTA}
            </button>
            <p className="mt-8 text-[12px] text-white/35">{LANDING_CTA_FOOTNOTE}</p>
          </section>

          <LandingPageFooter />
        </main>
      </LandingPreviewShell>

      <LandingMobileStickyCta
        onStart={withLandingCta(scrollToPublicTest)}
        introOpen={introOpen}
        suppressed={publicTestPreviewActive}
      />
    </div>
  );
}
