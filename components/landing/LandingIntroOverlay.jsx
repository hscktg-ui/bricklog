"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "@/hooks/useViewport";
import { getLandingIntroCopy } from "@/lib/landing/introCopy";
import {
  INTRO_BRAND_REVEAL_DELAY_MS,
  INTRO_BRAND_REVEAL_DELAY_MS_MOBILE,
} from "@/lib/landing/introTiming";
import { BRICLOG_CTA_PILL } from "@/lib/ui/actionButtonStyles";
import {
  useIntroRevealTypewriter,
  useIntroTypewriter,
} from "@/lib/landing/useIntroTypewriter";

const BRAND_LINE_CLASS = [
  "text-[28px] font-bold tracking-tight text-[#03A94D] sm:text-[36px]",
  "text-[21px] font-bold tracking-tight text-[#191F28] sm:text-[28px]",
];

function IntroProgress({ total, current }) {
  return (
    <div
      className="mt-5 flex justify-center gap-1.5 sm:mt-6"
      aria-hidden
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
            i === current
              ? "w-5 bg-[#03C75A]"
              : i < current
                ? "w-1.5 bg-[#03C75A]/35"
                : "w-1.5 bg-[#E8EBED]"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * 인트로 카피 순차 노출 → 브랜드 → 「지금 시작하기」
 */
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
    if (!open) return undefined;
    const id = window.setTimeout(() => {
      setCanStart(true);
    }, 4_500);
    return () => window.clearTimeout(id);
  }, [open]);

  const finish = useCallback(() => {
    if (exiting || !canStart) return;
    setExiting(true);
    schedule(() => onDismiss(), reduceMotion ? 140 : 420);
  }, [exiting, canStart, onDismiss, reduceMotion, schedule]);

  if (!open) return null;

  const showCta = brandPhase && (reduceMotion || brandComplete);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAFBFC] px-3 sm:px-6 ${
        exiting ? "pointer-events-none briclog-intro-exit" : ""
      } ${canStart && !exiting ? "cursor-pointer" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="BRICLOG 소개"
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(3,199,90,0.07),transparent_55%)]"
        aria-hidden
      />

      <div
        className={`relative z-10 flex w-full max-w-lg flex-col items-center ${
          reduceMotion ? "" : "briclog-intro-desk-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="briclog-intro-card w-full px-5 py-8 text-center sm:px-8 sm:py-10">
            {!brandPhase ? (
              <>
                <div className="text-[17px] leading-[1.75] sm:text-[21px]">
                  <p
                    className="min-h-[1.75em] font-medium text-[#191F28]"
                    aria-live="polite"
                  >
                    {display}
                  </p>
                </div>
                <IntroProgress total={lineCount} current={lineIndex} />
              </>
            ) : (
              <div
                className="flex min-h-[112px] flex-col items-center justify-center py-2 text-center sm:min-h-[132px]"
                aria-live="polite"
              >
                {brandDone.map((line, i) => (
                  <p
                    key={`done-${i}`}
                    className={`${BRAND_LINE_CLASS[i] ?? ""} ${i === 1 ? "mt-2" : ""}`}
                  >
                    {line}
                  </p>
                ))}
                {brandTyping ? (
                  <p
                    className={`${BRAND_LINE_CLASS[brandLineIndex] ?? ""} ${
                      brandLineIndex === 1 ? "mt-2" : ""
                    }`}
                  >
                    {brandDisplay}
                  </p>
                ) : null}
              </div>
            )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-7">
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
                  ? `${BRICLOG_CTA_PILL} ${reduceMotion ? "" : "briclog-intro-start-cta"}`
                  : `${BRICLOG_CTA_PILL} pointer-events-none opacity-80`
                : "pointer-events-none opacity-0"
            }
            aria-label={copy.dismissLabel}
          >
            {copy.startLabel}
          </button>
          {canStart && (
            <p className="text-[11px] text-[#8B95A1] sm:text-[12px]">
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
              className="briclog-no-slab text-[12px] font-medium text-[#8B95A1] underline-offset-2 hover:text-[#4E5968] hover:underline"
            >
              건너뛰기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
