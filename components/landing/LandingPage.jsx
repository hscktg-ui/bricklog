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
import PricingSection from "./PricingSection";
import {
  LANDING_CTA_FOOTNOTE,
  LANDING_CTA_HEADLINE,
  LANDING_CTA_PHILOSOPHY,
  LANDING_CTA_SUB,
} from "@/lib/landing/ctaCopy";
import LandingMobileStickyCta from "@/components/landing/LandingMobileStickyCta";
import PublicBrandTestSection from "@/components/landing/public-test/PublicBrandTestSection";

export default function LandingPage({ onAuthOpen, onStart }) {
  const { greeting, sample, contentIdea, seasonCopy, theme } =
    useLandingVisit();
  /** 세션당 1회 인트로 — localStorage 영구 숨김 제거 */
  const [introOpen, setIntroOpen] = useState(false);

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
    <div className="min-h-[100dvh] bg-[#F7F8FA] text-[#191F28] [--landing-cta-h:3.75rem]">
      <LandingIntroOverlay
        open={introOpen}
        onDismiss={handleIntroDismiss}
        onSkip={handleIntroDismiss}
      />

      <header
        className={`sticky top-0 z-30 border-b border-[#E8EBED]/80 bg-[#F7F8FA]/95 backdrop-blur-md transition-opacity duration-500 ${
          introOpen
            ? "pointer-events-none opacity-100"
            : "opacity-100 briclog-landing-reveal"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 md:px-8 md:py-3">
          <Logo iconSize={28} />
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <BgmToggle fullWidth={false} className="hidden shrink-0 bg-white/90 sm:flex" />
            <button
              type="button"
              onClick={() => onAuthOpen("login")}
              className="rounded-lg px-2.5 py-2 text-[13px] font-semibold text-[#4E5968] hover:bg-white sm:px-3"
            >
              로그인
            </button>
            <button
              type="button"
              data-briclog-cta="start"
              onClick={handleStart}
              className="briclog-btn-primary hidden !min-h-[40px] !w-auto !py-2 !text-[12px] sm:inline-flex sm:!px-4 sm:!text-[13px]"
            >
              <span>무료 시작</span>
            </button>
          </nav>
        </div>
      </header>

      <LandingPreviewShell>
      <main
        id="landing-main"
        className={`pt-[3.25rem] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pt-0 sm:pb-0 ${
          introOpen
            ? "pointer-events-none opacity-100"
            : "opacity-100 briclog-landing-reveal"
        }`}
      >
        <HeroSection
          greeting={greeting}
          seasonCopy={seasonCopy}
          theme={theme}
          contentIdea={contentIdea}
          onStart={handleStart}
          onSample={withLandingCta(scrollToSample)}
          onTest={withLandingCta(() => {
            document
              .getElementById("public-brand-test")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          })}
        />
        <PublicBrandTestSection onSignup={(mode) => onAuthOpen(mode || "signup")} />
        <LiveStatsBanner introOpen={introOpen} />
        <DemoPreviewSection sample={sample} />
        <details className="group border-t border-[#E8EBED] bg-white">
          <summary className="mx-auto flex max-w-6xl cursor-pointer list-none items-center justify-between gap-2 px-4 py-5 text-[14px] font-semibold text-[#4E5968] marker:content-none md:px-8 [&::-webkit-details-marker]:hidden">
            <span>브릭로그가 어떻게 돌아가는지 더 보기</span>
            <span className="text-[#8B95A1] transition group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-[#E8EBED] bg-[#FAFBFC]">
            <DemoFlow sample={sample} />
            <ChannelPreview sample={sample} />
            <WorkflowSection />
            <WhyBriclog />
          </div>
        </details>
        <PricingSection onStart={handleStart} />

        <section className="border-t border-[#E8EBED] bg-[#191F28] px-4 py-14 text-center md:px-8 md:py-16">
          <p className="text-[20px] font-bold leading-snug text-white md:text-[26px]">
            {LANDING_CTA_HEADLINE}
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-[#B0B8C1]">
            {LANDING_CTA_SUB}
          </p>
          {LANDING_CTA_PHILOSOPHY ? (
            <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-[#8B95A1]">
              {LANDING_CTA_PHILOSOPHY}
            </p>
          ) : null}
          <button
            type="button"
            data-briclog-cta="start"
            onClick={handleStart}
            className="briclog-btn-primary mt-8 hidden !w-auto px-10 sm:inline-flex"
          >
            <span>무료로 시작하기</span>
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="mt-6 text-[14px] font-semibold text-[#03C75A] underline-offset-2 hover:underline sm:hidden"
          >
            무료로 시작하기
          </button>
          <p className="mt-6 text-[12px] text-[#6B7684]">{LANDING_CTA_FOOTNOTE}</p>
        </section>
      </main>
      </LandingPreviewShell>

      <LandingMobileStickyCta
        onStart={withLandingCta(() => {
          document
            .getElementById("public-brand-test")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        })}
        introOpen={introOpen}
      />
    </div>
  );
}
