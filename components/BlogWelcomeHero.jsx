"use client";

import Icon from "@/components/Icon";
import { BRAND_TAGLINE, BRAND_PHILOSOPHY, PIPELINE_STEPS } from "@/lib/constants";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_STATUS_OK,
} from "@/lib/landing/vision2030Styles";

export default function BlogWelcomeHero({ onTrySample, isGenerating }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className={`${VISION_PANEL} overflow-hidden`}>
        <div className="border-b border-[var(--vision-line)] bg-[var(--vision-glass-strong)] px-6 py-8 md:px-8 md:py-10">
          <p className={VISION_EYEBROW}>브릭로그</p>
          <h2 className="mt-2 text-[22px] font-bold leading-snug tracking-[-0.02em] text-[var(--vision-ink)] md:text-[26px]">
            {BRAND_TAGLINE}
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--vision-muted)]">
            {BRAND_PHILOSOPHY}{" "}
            맞춤 개인화와 맞춤 브랜드화로 블로그·플레이스·인스타 초안을 한 흐름에
            준비합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onTrySample}
              className={`${VISION_CTA_ACCENT} !w-auto !min-h-[48px] !px-5 !py-3 !text-[14px] disabled:opacity-60`}
            >
              {isGenerating ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#041208]/30 border-t-[#041208]" />
                  샘플 생성 중…
                </>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Icon name="document" className="h-5 w-5" />
                  샘플로 30초 체험
                </span>
              )}
            </button>
            <span className="flex items-center text-[13px] text-[var(--vision-muted)]">
              왼쪽 폼에 직접 입력해도 됩니다
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--vision-line)] sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step.id}
              className="flex flex-col gap-2 bg-[var(--vision-panel-bg,#fff)] px-4 py-4 md:px-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(48,209,88,0.12)] text-[11px] font-bold text-[var(--vision-accent)]">
                  {i + 1}
                </span>
                <Icon name={step.icon} className="h-4 w-4 text-[var(--vision-accent)]" />
              </div>
              <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
                {step.label}
              </p>
              <p className="text-[12px] leading-snug text-[var(--vision-muted)]">
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
      className={`${VISION_STATUS_OK} mt-6 border-dashed p-5`}
      aria-hidden
    >
      <p className="text-[11px] font-medium text-[var(--vision-muted)]">
        생성 후 미리보기 예시
      </p>
      <div className="mt-3 space-y-2 opacity-90">
        <div className="h-3 w-3/4 max-w-xs rounded bg-[var(--vision-line-strong)]" />
        <div className="h-2 w-full rounded bg-[var(--vision-line)]" />
        <div className="h-2 w-[92%] rounded bg-[var(--vision-line)]" />
        <div className="h-2 w-[85%] rounded bg-[var(--vision-line)]" />
        <div className="mt-4 flex gap-2">
          <span className="rounded-full border border-[rgba(48,209,88,0.2)] bg-[rgba(48,209,88,0.1)] px-2 py-1 text-[10px] font-medium text-[var(--vision-ink)]">
            블로그 2,000자+
          </span>
          <span className="rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-2 py-1 text-[10px] font-medium text-[var(--vision-muted)]">
            플레이스 공지
          </span>
          <span className="rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-2 py-1 text-[10px] font-medium text-[var(--vision-muted)]">
            인스타 캡션
          </span>
        </div>
      </div>
    </div>
  );
}
