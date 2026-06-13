"use client";

import { useEffect, useRef, useState } from "react";
import {
  playPageTurnSound,
  playSuccessSound,
} from "@/lib/audio/briclogSounds";
import {
  getGenerationSteps,
  getCompleteMessage,
  getFeedbackRewriteSteps,
  FEEDBACK_COMPLETE_MESSAGE,
  PLACE_FEEDBACK_COMPLETE_MESSAGE,
  INSTA_FEEDBACK_COMPLETE_MESSAGE,
} from "@/lib/loading/generationSteps";
import { LOADING } from "@/lib/product/craft";
import { formatDurationKo } from "@/lib/loading/estimateGenerationMs";

function formatElapsedMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function GenerationLoadingOverlay({
  active,
  channel = "blog",
  complete = false,
  stepLabel = null,
  sensitiveIndustry = false,
  startedAt = null,
  estimatedMs = null,
  completeMessage = null,
  peekResults = false,
  quietSuccess = false,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [remainingLabel, setRemainingLabel] = useState(null);
  const [visible, setVisible] = useState(active);
  const [fadingOut, setFadingOut] = useState(false);
  const wasActiveRef = useRef(false);
  const wasCompleteRef = useRef(false);
  const steps =
    channel === "feedback" ||
    channel === "place-feedback" ||
    channel === "instagram-feedback"
      ? getFeedbackRewriteSteps(channel)
      : getGenerationSteps(channel, { sensitiveIndustry });

  const dismissOverlay = () => {
    window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
  };

  useEffect(() => {
    if (active) {
      setVisible(true);
      setFadingOut(false);
      return undefined;
    }
    if (!visible) return undefined;
    setFadingOut(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
    }, 320);
    return () => window.clearTimeout(t);
  }, [active, visible]);

  useEffect(() => {
    if (!active || complete || stepLabel) {
      setStepIndex(0);
      return;
    }
    const ms =
      channel === "feedback" ||
      channel === "place-feedback" ||
      channel === "instagram-feedback"
        ? 1000
        : channel === "pipeline"
          ? 900
          : 1100;
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, ms);
    return () => clearInterval(id);
  }, [active, complete, steps.length, stepLabel, channel, sensitiveIndustry]);

  useEffect(() => {
    if (!active || complete) {
      setElapsedLabel("00:00");
      setRemainingLabel(null);
      return undefined;
    }
    const origin = startedAt ?? Date.now();
    const tick = () => {
      const elapsed = Date.now() - origin;
      const secs = elapsed / 1000;
      setElapsedLabel(formatElapsedMmSs(secs));
      if (estimatedMs && estimatedMs > 0) {
        const left = estimatedMs - elapsed;
        setRemainingLabel(left > 0 ? formatDurationKo(left) : null);
      } else {
        setRemainingLabel(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, complete, startedAt, estimatedMs]);

  useEffect(() => {
    if (active && !complete && !wasActiveRef.current) {
      wasActiveRef.current = true;
      wasCompleteRef.current = false;
      const t = requestAnimationFrame(() => {
        void playPageTurnSound();
      });
      return () => cancelAnimationFrame(t);
    }
    if (!active) {
      wasActiveRef.current = false;
      wasCompleteRef.current = false;
    }
  }, [active, complete]);

  useEffect(() => {
    if (active && complete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      if (quietSuccess) return undefined;
      const t = requestAnimationFrame(() => {
        void playSuccessSound();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [active, complete, quietSuccess]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") dismissOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!visible) return null;

  const step = stepLabel
    ? { icon: "✨", text: stepLabel }
    : steps[stepIndex] || steps[0];
  const doneMsg =
    completeMessage ||
    (channel === "place-feedback"
      ? PLACE_FEEDBACK_COMPLETE_MESSAGE
      : channel === "instagram-feedback"
        ? INSTA_FEEDBACK_COMPLETE_MESSAGE
        : channel === "feedback"
          ? FEEDBACK_COMPLETE_MESSAGE
          : getCompleteMessage(channel));

  const backdropClass = peekResults
    ? "absolute inset-0 bg-[#191F28]/10"
    : "absolute inset-0 bg-[#191F28]/32 backdrop-blur-[2px]";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[220] flex items-center justify-center transition-opacity duration-300 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className={backdropClass} aria-hidden />
      <div className="briclog-surface pointer-events-auto relative z-10 mx-4 w-full max-w-sm px-6 py-8 sm:max-w-md sm:px-8 sm:py-9">
        <button
          type="button"
          onClick={dismissOverlay}
          className="briclog-pressable absolute right-3 top-3 rounded-lg px-2 py-1 text-[12px] font-medium text-[#8B95A1] hover:bg-[#F7F8FA] hover:text-[#4E5968]"
        >
          <span>닫기</span>
        </button>
        {complete ? (
          <p className="text-center text-[15px] font-semibold leading-relaxed text-[#191F28] sm:text-[16px]">
            {doneMsg}
          </p>
        ) : (
          <>
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#E8EBED] border-t-[#03C75A]" />
            <p className="mt-5 text-center text-[14px] font-semibold leading-snug text-[#191F28] sm:mt-6 sm:text-[15px]">
              {step.text}
            </p>
            <p className="mt-2 text-center text-[11px] tabular-nums text-[#8B95A1]">
              {LOADING.generationElapsed(elapsedLabel)}
              {remainingLabel
                ? ` · ${LOADING.generationRemaining(remainingLabel)}`
                : null}
            </p>
            {!stepLabel && steps.length > 1 ? (
              <p className="mt-1.5 text-center text-[10px] font-semibold tabular-nums text-[#03A94D]">
                {stepIndex + 1} / {steps.length}
              </p>
            ) : null}
            <p className="mt-1 text-center text-[11px] text-[#B0B8C1]">
              {!remainingLabel
                ? LOADING.generationOverEstimate
                : LOADING.generationSub}
            </p>
            {!stepLabel && (
              <div className="mt-4 flex justify-center gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === stepIndex ? "bg-[#03C75A]" : "bg-[#E8EBED]"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
