"use client";

import Icon from "@/components/Icon";
import { BRAND_TAGLINE, BRAND_PHILOSOPHY, PIPELINE_STEPS } from "@/lib/constants";

export default function BlogWelcomeHero({ onTrySample, isGenerating }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="overflow-hidden rounded-2xl border border-[#E8EBED] bg-gradient-to-br from-white via-white to-[#E8F9EF] shadow-sm">
        <div className="border-b border-[#E8EBED]/80 bg-white/60 px-6 py-8 md:px-8 md:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#03A94D]">
            BRICLOG
          </p>
          <h2 className="mt-2 text-[22px] font-bold leading-snug text-[#191F28] md:text-[26px]">
            {BRAND_TAGLINE}
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#4E5968]">
            {BRAND_PHILOSOPHY}
            {" "}
            맞춤 개인화와 맞춤 브랜드화로 블로그·플레이스·인스타 초안을 한 흐름에
            준비합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onTrySample}
              className="inline-flex items-center gap-2 rounded-xl bg-[#03C75A] px-5 py-3 text-[14px] font-semibold text-white shadow-sm hover:bg-[#02B350] disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  샘플 생성 중…
                </>
              ) : (
                <>
                  <Icon name="document" className="h-5 w-5" />
                  샘플로 30초 체험
                </>
              )}
            </button>
            <span className="flex items-center text-[13px] text-[#8B95A1]">
              왼쪽 폼에 직접 입력해도 됩니다
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-[#E8EBED] sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step.id}
              className="flex flex-col gap-2 bg-white px-4 py-4 md:px-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F9EF] text-[11px] font-bold text-[#03A94D]">
                  {i + 1}
                </span>
                <Icon name={step.icon} className="h-4 w-4 text-[#03C75A]" />
              </div>
              <p className="text-[13px] font-semibold text-[#191F28]">
                {step.label}
              </p>
              <p className="text-[12px] leading-snug text-[#8B95A1]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <PreviewMock />
    </div>
  );
}

function PreviewMock() {
  return (
    <div
      className="mt-6 rounded-xl border border-dashed border-[#E8EBED] bg-white/80 p-5"
      aria-hidden
    >
      <p className="text-[11px] font-medium text-[#8B95A1]">생성 후 미리보기 예시</p>
      <div className="mt-3 space-y-2 opacity-90">
        <div className="h-3 w-3/4 max-w-xs rounded bg-[#E8EBED]" />
        <div className="h-2 w-full rounded bg-[#F0F2F4]" />
        <div className="h-2 w-[92%] rounded bg-[#F0F2F4]" />
        <div className="h-2 w-[85%] rounded bg-[#F0F2F4]" />
        <div className="mt-4 flex gap-2">
          <span className="rounded-md bg-[#E8F9EF] px-2 py-1 text-[10px] font-medium text-[#03A94D]">
            블로그 2,000자+
          </span>
          <span className="rounded-md bg-[#F7F8FA] px-2 py-1 text-[10px] font-medium text-[#4E5968]">
            플레이스 공지
          </span>
          <span className="rounded-md bg-[#F7F8FA] px-2 py-1 text-[10px] font-medium text-[#4E5968]">
            인스타 캡션
          </span>
        </div>
      </div>
    </div>
  );
}
