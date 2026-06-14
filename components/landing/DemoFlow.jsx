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
        <p className={`text-center ${VISION_EYEBROW}`}>How it works</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          쓰는 순서
        </h2>
        <p className={`mt-3 text-center ${VISION_SUB}`}>
          브랜드 · 지역 → 오늘의 주제 → 조사 후 글 받기 → 플레이스 · 인스타 → 복사
        </p>

        <div className={`mt-10 overflow-hidden ${VISION_PANEL}`}>
          <LandingPanelHeader title="브릭로그 · 글쓰기" />

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
    <MockTopic key="1" sample={sample} />,
    <MockContext key="2" />,
    <MockChannels key="3" />,
    <MockCopy key="4" />,
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
    <div className="rounded-2xl border border-[var(--vision-line)] bg-white p-3 text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="text-[var(--vision-muted)]">브랜드명</p>
      <p className="mt-1 font-semibold text-[var(--vision-ink)]">{sample.brand.name}</p>
    </div>
  );
}

function MockTopic({ sample }) {
  return (
    <div className="rounded-2xl border border-[var(--vision-line)] bg-white p-3 text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="text-[var(--vision-muted)]">오늘의 주제</p>
      <p className="mt-2 rounded-xl bg-[var(--vision-paper)] px-2 py-2 text-[var(--vision-ink)]">
        {sample.topic}
      </p>
    </div>
  );
}

function MockContext() {
  return (
    <div className="space-y-2 text-[11px]">
      {["말투 정리", "채널별 길이", "올리기 전 확인"].map((t) => (
        <div
          key={t}
          className="flex items-center gap-2 rounded-xl border border-[var(--vision-line)] bg-white px-3 py-2"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--vision-accent)]" />
          <span className="text-[var(--vision-muted)]">{t}</span>
        </div>
      ))}
    </div>
  );
}

function MockChannels() {
  return (
    <div className="grid grid-cols-1 gap-2 text-[10px] @min-[280px]:grid-cols-3">
      {["이야기", "플레이스", "인스타"].map((c) => (
        <div
          key={c}
          className="rounded-xl bg-[rgba(48,209,88,0.12)] px-2 py-3 text-center font-semibold text-[var(--vision-ink)]"
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function MockCopy() {
  return (
    <div className="rounded-2xl border border-[rgba(48,209,88,0.25)] bg-white p-3 text-center text-[12px] shadow-[var(--vision-shadow-soft)]">
      <p className="font-semibold text-[var(--vision-ink)]">복사 완료</p>
      <p className="mt-1 text-[var(--vision-muted)]">복사 완료 · 발행 전 확인 OK</p>
    </div>
  );
}
