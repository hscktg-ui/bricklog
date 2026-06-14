"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "@/hooks/useViewport";
import { getLandingIntroCopy } from "@/lib/landing/introCopy";
import {
  BRICLOG_INTRO_CHANNELS,
  BRICLOG_INTRO_EYEBROW,
} from "@/lib/landing/briclogColorPhilosophy";
import {
  INTRO_BRAND_REVEAL_DELAY_MS,
  INTRO_BRAND_REVEAL_DELAY_MS_MOBILE,
} from "@/lib/landing/introTiming";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
} from "@/lib/landing/vision2030Styles";
import {
  useIntroRevealTypewriter,
  useIntroTypewriter,
} from "@/lib/landing/useIntroTypewriter";

const BRAND_LINE_CLASS = [
  "text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--vision-accent)]",
  "text-[17px] font-medium tracking-[-0.01em] text-[var(--vision-muted)] sm:text-[19px]",
  "text-[14px] font-medium tracking-[0.02em] text-[var(--vision-muted)] sm:text-[15px]",
];

function IntroStackVisual() {
  return (
    <div className="briclog-intro-stack" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

function IntroChannelPills() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      {BRICLOG_INTRO_CHANNELS.map((label) => (
        <span key={label} className="briclog-intro-channel-pill">
          {label}
        </span>
      ))}
    </div>
  );
}

function IntroProgress({ total, current }) {
  return (
    <div className="mt-8 flex justify-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] rounded-full transition-all duration-500 ${
            i === current
              ? "w-8 bg-[var(--vision-accent)]"
              : i < current
                ? "w-2 bg-[var(--vision-accent)]/50"
                : "w-2 bg-[var(--vision-line)]"
          }`}
        />
      ))}
    </div>
  );
}

export default function LandingIntroOverlay({ open, onDismiss, onSkip }) {
  const { isMobile } = useViewport();
  const copy = useMemo(() => getLandingIntroCopy({ isMobile }), [isMobile]);
  const lineCount = copy.lines.length;

  const [brandPhase, setBrandPhase] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const brandRevealDelay = isMobile
    ? INTRO_BRAND_REVEAL_DELAY_MS_MOBILE
    : INTRO_BRAND_REVEAL_DELAY_MS;

  const handleLinesFinished = useCallback(() => {
    schedule(() => setBrandPhase(true), brandRevealDelay);
  }, [schedule, brandRevealDelay]);

  const { lineIndex, display } = useIntroTypewriter({
    enabled: open && !brandPhase,
    lines: copy.lines,
    reduceMotion,
    loop: false,
    onFinished: handleLinesFinished,
  });

  const {
    completedLines: brandDone,
    lineIndex: brandLineIndex,
    display: brandDisplay,
    active: brandActive,
  } = useIntroRevealTypewriter({
    enabled: open && brandPhase,
    lines: copy.brandLines,
    reduceMotion,
    startDelayMs: reduceMotion ? 0 : isMobile ? 180 : 260,
  });

  const brandLineCount = copy.brandLines.length;
  const brandComplete = brandDone.length === brandLineCount && !brandActive;
  const brandTyping =
    brandActive &&
    brandLineIndex < brandLineCount &&
    Boolean(brandDisplay?.length);

  useEffect(() => {
    if (!open || !brandPhase || !brandComplete) return undefined;
    if (reduceMotion) {
      setCanStart(true);
      return undefined;
    }
    setCanStart(false);
    const id = setTimeout(() => setCanStart(true), 320);
    return () => clearTimeout(id);
  }, [open, brandPhase, brandComplete, reduceMotion]);

  useEffect(() => {
    if (!open) return undefined;
    setExiting(false);
    setBrandPhase(false);
    setCanStart(false);
    clearTimers();
    if (reduceMotion) {
      schedule(() => {
        setBrandPhase(true);
        setCanStart(true);
      }, 200);
    }
    return clearTimers;
  }, [open, reduceMotion, clearTimers, schedule]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || brandPhase) return undefined;
    const id = window.setTimeout(() => setCanStart(true), 3_200);
    return () => window.clearTimeout(id);
  }, [open, brandPhase, lineCount]);

  const finish = useCallback(() => {
    if (exiting || !canStart) return;
    setExiting(true);
    schedule(() => onDismiss(), reduceMotion ? 140 : 420);
  }, [exiting, canStart, onDismiss, reduceMotion, schedule]);

  if (!open) return null;

  const showCta = brandPhase && (reduceMotion || brandComplete);

  return (
    <div
      className={`briclog-vision-intro fixed inset-0 z-[100] flex flex-col items-center justify-center px-4 sm:px-6 ${
        exiting ? "pointer-events-none briclog-intro-exit" : ""
      } ${canStart && !exiting ? "cursor-pointer" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="브릭로그 소개"
      onClick={() => canStart && !exiting && finish()}
      tabIndex={canStart ? 0 : -1}
      onKeyDown={(e) => {
        if (canStart && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          finish();
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--vision-accent-soft),transparent_62%)]"
        aria-hidden
      />

      <div
        className={`relative z-10 flex w-full max-w-lg flex-col items-center sm:max-w-xl ${
          reduceMotion ? "" : "briclog-intro-desk-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="briclog-vision-intro-card w-full px-6 py-10 text-center sm:px-10 sm:py-12">
          <p className={`${VISION_EYEBROW} mb-4`}>{BRICLOG_INTRO_EYEBROW}</p>
          <IntroStackVisual />

          <div
            key={brandPhase ? "brand" : "lines"}
            className={`min-h-[148px] sm:min-h-[168px] ${
              reduceMotion ? "" : "briclog-intro-phase-in"
            }`}
          >
            {!brandPhase ? (
              <>
                <div className="text-[19px] leading-[1.65] sm:text-[22px]">
                  <p
                    className="min-h-[1.65em] font-medium text-[var(--vision-ink)]"
                    aria-live="polite"
                  >
                    {display}
                  </p>
                </div>
                <IntroProgress total={lineCount} current={lineIndex} />
                <IntroChannelPills />
              </>
            ) : (
              <div
                className="flex min-h-[148px] flex-col items-center justify-center py-1 text-center sm:min-h-[168px]"
                aria-live="polite"
              >
                {brandDone.map((line, i) => (
                  <p
                    key={`done-${i}`}
                    className={`${BRAND_LINE_CLASS[i] ?? BRAND_LINE_CLASS[1]} briclog-intro-brand-fade ${
                      i >= 1 ? "mt-2 sm:mt-3" : ""
                    }`}
                  >
                    {line}
                  </p>
                ))}
                {brandTyping ? (
                  <p
                    className={`${BRAND_LINE_CLASS[brandLineIndex] ?? BRAND_LINE_CLASS[1]} ${
                      brandLineIndex >= 1 ? "mt-2 sm:mt-3" : ""
                    }`}
                  >
                    {brandDisplay}
                  </p>
                ) : null}
                {brandComplete ? (
                  <IntroChannelPills />
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            disabled={!canStart || exiting}
            className={
              showCta
                ? canStart
                  ? `${VISION_CTA_ACCENT} !min-w-[220px]`
                  : `${VISION_CTA_ACCENT} pointer-events-none opacity-50 !min-w-[220px]`
                : "pointer-events-none opacity-0"
            }
            aria-label={copy.dismissLabel}
          >
            {copy.startLabel}
          </button>
          {canStart && showCta && (
            <p className="text-[12px] text-[var(--vision-muted)]">
              화면을 눌러 시작할 수 있어요
            </p>
          )}
          {onSkip && (
            <button
              type="button"
              data-briclog-intro-skip="1"
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="briclog-no-slab text-[13px] font-medium text-[var(--vision-muted)] underline-offset-4 hover:text-[var(--vision-ink)] hover:underline"
            >
              건너뛰기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
