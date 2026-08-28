"use client";

import { useEffect, useState } from "react";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import { DEMO_FLOW_STEPS, LANDING_SAMPLE } from "@/lib/landing/sampleContent";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SECTION,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const STEP_MS = 2200;

export default function DemoFlow({ sample }) {
  const landingSample = sample ?? LANDING_SAMPLE;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % DEMO_FLOW_STEPS.length);
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const current = DEMO_FLOW_STEPS[step];

  return (
    <section className={`${VISION_SECTION} px-4 py-14 md:px-8 md:py-20`}>
      <div className="mx-auto max-w-4xl">
        <p className={`text-center ${VISION_EYEBROW}`}>쓰는 순서</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          브랜드부터 채널까지
        </h2>
        <p className={`mt-3 text-center ${VISION_SUB}`}>
          브랜드 → 월·주 계획 → 운영 글 → 상품 화면 → 다음 주
        </p>

        <div className={`mt-10 overflow-hidden ${VISION_PANEL}`}>
          <LandingPanelHeader title="브릭로그 · 운영 계획" />

          <div className="grid min-h-[180px] grid-cols-1 gap-0 @min-[640px]:min-h-[220px] @min-[640px]:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-[var(--vision-line)] p-5 md:border-b-0 md:border-r">
              <p className={`text-[12px] font-medium ${VISION_EYEBROW}`}>
                {step + 1} / {DEMO_FLOW_STEPS.length}
              </p>
              <p
                key={step}
                className="mt-3 animate-[fadeIn_0.4s_ease-out] text-[17px] font-semibold tracking-[-0.02em] text-[var(--vision-ink)]"
              >
                {current.title}
              </p>
              <p className="mt-2 text-[13px] text-[var(--vision-muted)]">{current.hint}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {DEMO_FLOW_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`단계 ${i + 1}`}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? "w-8 bg-[var(--vision-ink)]"
                        : "w-3 bg-[var(--vision-line-strong)] hover:bg-[var(--vision-muted)]"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center bg-[var(--vision-paper)] p-5">
              <MockStepVisual step={step} sample={landingSample} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockStepVisual({ step, sample }) {
  const panels = [
    <MockBrand key="0" sample={sample} />,
    <MockMonthPlan key="1" />,
    <MockTopic key="2" sample={sample} />,
    <MockChannels key="3" />,
    <MockNextWeek key="4" />,
  ];
  return (
    <div
      key={step}
      className="w-full max-w-[280px] animate-[fadeIn_0.35s_ease-out]"
    >
      {panels[step]}
    </div>
  );
}

function MockBrand({ sample }) {
  return (
    <div className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-3 text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="text-[var(--vision-muted)]">브랜드명</p>
      <p className="mt-1 font-semibold text-[var(--vision-ink)]">{sample.brand.name}</p>
    </div>
  );
}

function MockMonthPlan() {
  return (
    <div className="w-full space-y-2 text-[11px]">
      {["1주 · 시즌 소식", "2주 · 플레이스", "3주 · 인스타"].map((t) => (
        <div
          key={t}
          className="rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3 py-2.5 font-medium text-[var(--vision-ink)]"
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function MockTopic({ sample }) {
  return (
    <div className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-3 text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="text-[var(--vision-muted)]">이번 주 주제</p>
      <p className="mt-2 rounded-xl bg-[var(--vision-paper)] px-2 py-2 text-[var(--vision-ink)]">
        {sample.topic}
      </p>
    </div>
  );
}

function MockChannels() {
  return (
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      {["이야기", "플레이스", "인스타", "상세"].map((c) => (
        <div
          key={c}
          className="rounded-xl bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))] px-2 py-3 text-center font-semibold text-[var(--vision-ink)]"
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function MockNextWeek() {
  return (
    <div className="rounded-2xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.25))] bg-[var(--vision-panel-bg,#fff)] p-3 text-center text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="font-semibold text-[var(--vision-ink)]">상세 · 다음 주</p>
      <p className="mt-1 text-[var(--vision-muted)]">상품 화면은 상세에서, 운영은 계획에서</p>
    </div>
  );
}
