"use client";

import { useEffect, useMemo, useState } from "react";
import SkeletonPreview from "@/components/SkeletonPreview";
import SketchStepIcon from "@/components/icons/SketchStepIcon";
import { CUSTOMER_BLOG_UI_STEPS } from "@/lib/loading/generationSteps";
import { useMobileWriteUx } from "@/hooks/useMobileWriteUx";
import {
  VISION_LOADING_PANEL,
  VISION_PROGRESS_FILL,
  VISION_PROGRESS_TRACK,
} from "@/lib/landing/vision2030Styles";

function resolveActiveStepIndex(stepLabel, steps) {
  if (!stepLabel) return 0;
  const norm = String(stepLabel).replace(/\s/g, "");
  const idx = steps.findIndex((s) =>
    norm.includes(String(s.text).replace(/\s/g, "").slice(0, 4))
  );
  return idx >= 0 ? idx : 0;
}

export default function GeneratingResultPlaceholder({
  compact = false,
  phase = "writing",
  previewTitle = null,
  channelLabel = "이야기",
  stepLabel = null,
  startedAt = null,
}) {
  const { simplifyUi: mobileSimple } = useMobileWriteUx();
  const revealing = phase === "revealing";
  const steps = CUSTOMER_BLOG_UI_STEPS;
  const activeIndex = useMemo(
    () => resolveActiveStepIndex(stepLabel, steps),
    [stepLabel, steps]
  );
  const [pulseStep, setPulseStep] = useState(activeIndex);

  useEffect(() => {
    setPulseStep(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (revealing || stepLabel) return undefined;
    const id = window.setInterval(() => {
      setPulseStep((i) => (i + 1) % steps.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [revealing, stepLabel, steps.length]);

  const displayIndex = stepLabel ? activeIndex : pulseStep;
  const currentStep = steps[displayIndex] || steps[0];
  const progressPct = Math.round(
    ((displayIndex + (revealing ? 1 : 0.35)) / steps.length) * 100
  );

  const title = revealing
    ? "원고 표시 중…"
    : "원고 작성 중…";
  const body = revealing
    ? "완성본을 올리고 있어요."
    : stepLabel || "브랜드·지역·주제에 맞춰 쓰고 있어요.";

  const elapsedSec =
    startedAt && !revealing
      ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : null;

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col px-2 py-6 md:py-10"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className={`${VISION_LOADING_PANEL} px-5 py-6 md:px-7 md:py-8`}>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center"
            aria-hidden
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--vision-accent)]" />
          </span>
          <p className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--vision-ink)]">
            {title}
          </p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--vision-muted)]">
          {body}
        </p>

        <div className="mt-4">
          <div className={VISION_PROGRESS_TRACK}>
            <div
              className={VISION_PROGRESS_FILL}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--vision-muted)]">
            {currentStep.text}
            {elapsedSec != null && elapsedSec >= 45
              ? " · 조금 더 걸리고 있어요"
              : ""}
          </p>
        </div>

        {!mobileSimple ? (
          <ol className="mt-5 space-y-2" aria-label="생성 단계">
            {steps.map((step, i) => {
              const done = i < displayIndex || (revealing && i < steps.length);
              const active = i === displayIndex && !revealing;
              const upcoming = i > displayIndex && !revealing;
              return (
                <li
                  key={step.text}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] ${
                    active
                      ? "bg-[rgba(48,209,88,0.1)] font-semibold text-[var(--vision-accent)]"
                      : done
                        ? "text-[var(--vision-muted)]"
                        : upcoming
                          ? "text-[var(--vision-line-strong)]"
                          : "text-[var(--vision-muted)]"
                  }`}
                >
                  <span className="flex w-5 shrink-0 items-center justify-center" aria-hidden>
                    {done && !active ? (
                      <SketchStepIcon id="check" done className="h-5 w-5" />
                    ) : step.sketch ? (
                      <SketchStepIcon
                        id={step.sketch}
                        active={active}
                        className="h-5 w-5"
                      />
                    ) : (
                      step.icon
                    )}
                  </span>
                  <span>{step.text}</span>
                  {active ? (
                    <span className="ml-auto text-[11px] font-normal text-[var(--vision-accent)]">
                      진행 중
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}

        {revealing && previewTitle ? (
          <p className="mt-4 rounded-xl border border-[rgba(48,209,88,0.18)] bg-[rgba(48,209,88,0.06)] px-3 py-2.5 text-[13px] font-medium leading-snug text-[var(--vision-ink)]">
            {previewTitle}
          </p>
        ) : null}

        {!mobileSimple ? (
          <div className="mt-6">
            <SkeletonPreview />
          </div>
        ) : null}
      </div>
      {!compact && !mobileSimple ? (
        <p className="mt-4 text-center text-[12px] text-[var(--vision-muted)]">
          {revealing
            ? "곧 아래에 전체 글이 펼쳐집니다"
            : elapsedSec != null && elapsedSec >= 8
              ? `약 ${elapsedSec}초 경과 · 완성되면 이 영역에 바로 표시됩니다`
              : "완성되면 이 영역에 바로 표시됩니다 · 창을 닫지 마세요"}
        </p>
      ) : null}
      {mobileSimple && !revealing ? (
        <p className="mt-4 text-center text-[12px] font-medium text-[var(--vision-muted)]">
          완성되면 「원고」로 전환 · 창을 닫지 마세요
        </p>
      ) : null}
    </div>
  );
}
