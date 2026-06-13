"use client";

import { useEffect, useState } from "react";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import { DEMO_FLOW_STEPS, LANDING_SAMPLE } from "@/lib/landing/sampleContent";

const STEP_MS = 2200;

export default function DemoFlow({ sample, previewDevice = "desktop" }) {
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
    <section className="px-4 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-[20px] font-bold text-[#191F28] md:text-[24px]">
          쓰는 순서
        </h2>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-[#8B95A1]">
          브랜드 · 지역 → 오늘의 주제 → 조사 후 글 받기 → 플레이스 · 인스타 → 복사
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8EBED] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <LandingPanelHeader title="브릭로그 · 글쓰기" />

          <div className="grid min-h-[180px] grid-cols-1 gap-0 @min-[640px]:min-h-[220px] @min-[640px]:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-[#E8EBED] p-5 md:border-b-0 md:border-r">
              <p className="text-[12px] font-medium text-[#8B95A1]">
                {step + 1}단계 · {DEMO_FLOW_STEPS.length}단계 중
              </p>
              <p
                key={step}
                className="mt-2 animate-[fadeIn_0.4s_ease-out] text-[17px] font-bold text-[#191F28]"
              >
                {current.title}
              </p>
              <p className="mt-2 text-[13px] text-[#4E5968]">{current.hint}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {DEMO_FLOW_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`단계 ${i + 1}`}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? "w-8 bg-[#03C75A]"
                        : "w-3 bg-[#E8EBED] hover:bg-[#B0B8C1]"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center bg-[#F7F8FA] p-5">
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
    <div className="rounded-xl border border-[#E8EBED] bg-white p-3 text-[12px]">
      <p className="text-[#8B95A1]">브랜드명</p>
      <p className="mt-1 font-semibold text-[#191F28]">
        {sample.brand.name}
      </p>
    </div>
  );
}

function MockTopic({ sample }) {
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-3 text-[12px]">
      <p className="text-[#8B95A1]">오늘의 주제</p>
      <p className="mt-2 rounded-lg bg-[#F7F8FA] px-2 py-2 text-[#191F28]">
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
          className="flex items-center gap-2 rounded-lg border border-[#E8EBED] bg-white px-3 py-2"
        >
          <span className="h-2 w-2 rounded-full bg-[#03C75A]" />
          <span className="text-[#4E5968]">{t}</span>
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
          className="rounded-lg bg-[#E8F9EF] px-2 py-3 text-center font-semibold text-[#03A94D]"
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function MockCopy() {
  return (
    <div className="rounded-xl border border-[#03C75A]/30 bg-white p-3 text-center text-[12px]">
      <p className="font-semibold text-[#03A94D]">복사 완료</p>
      <p className="mt-1 text-[#8B95A1]">복사 완료 · 발행 전 확인 OK</p>
    </div>
  );
}
