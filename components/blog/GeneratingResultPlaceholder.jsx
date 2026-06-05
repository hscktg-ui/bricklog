"use client";

import { useEffect, useMemo, useState } from "react";
import SkeletonPreview from "@/components/SkeletonPreview";
import SketchStepIcon from "@/components/icons/SketchStepIcon";
import { CUSTOMER_BLOG_UI_STEPS } from "@/lib/loading/generationSteps";
import { useMobileWriteUx } from "@/hooks/useMobileWriteUx";

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
    ? `${channelLabel} 표시 중…`
    : `${channelLabel} 만드는 중…`;
  const body = revealing
    ? "완성본을 화면에 올리고 있어요. 잠시만 기다려 주세요."
    : stepLabel ||
      "브랜드·지역·주제에 맞춰 이야기를 쓰고 있어요. 잠시만 기다려 주세요.";

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
      <div className="rounded-2xl border border-[#E8EBED] bg-white px-5 py-6 shadow-sm md:px-7 md:py-8">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center"
            aria-hidden
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#03C75A]" />
          </span>
          <p className="text-[16px] font-semibold text-[#191F28]">{title}</p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#4E5968]">{body}</p>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF1F4]">
            <div
              className="h-full rounded-full bg-[#03C75A] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#8B95A1]">
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
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] ${
                    active
                      ? "bg-[#F0FFF5] font-semibold text-[#03A94D]"
                      : done
                        ? "text-[#4E5968]"
                        : upcoming
                          ? "text-[#B0B8C1]"
                          : "text-[#4E5968]"
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
                    <span className="ml-auto text-[11px] font-normal text-[#03A94D]">
                      진행 중
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}

        {revealing && previewTitle ? (
          <p className="mt-4 rounded-lg border border-[#03C75A]/20 bg-[#F7FDF9] px-3 py-2.5 text-[13px] font-medium leading-snug text-[#191F28]">
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
        <p className="mt-4 text-center text-[12px] text-[#8B95A1]">
          {revealing
            ? "곧 아래에 전체 글이 펼쳐집니다"
            : elapsedSec != null && elapsedSec >= 8
              ? `약 ${elapsedSec}초 경과 · 완성되면 이 영역에 바로 표시됩니다`
              : "완성되면 이 영역에 바로 표시됩니다 · 창을 닫지 마세요"}
        </p>
      ) : null}
      {mobileSimple && !revealing ? (
        <p className="mt-4 text-center text-[12px] text-[#8B95A1]">
          완성되면 「편집본」으로 자동 전환됩니다 · 창을 닫지 마세요
        </p>
      ) : null}
    </div>
  );
}
