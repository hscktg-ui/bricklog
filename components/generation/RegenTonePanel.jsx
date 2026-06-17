"use client";

import { RETRY } from "@/lib/product/craft";
import { VISION_COPY_BTN } from "@/lib/landing/vision2030Styles";

/**
 * 다시 받기 + 사용자 톤 요청 — 한 화면·한 행동 (2030 작업실)
 */
export default function RegenTonePanel({
  toneRequest = "",
  onToneRequestChange,
  onRegenerate,
  busy = false,
  brandHabitsLine = "",
  rewriteCount = 0,
  className = "",
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--vision-line)] bg-gradient-to-br from-white via-white to-[rgba(48,209,88,0.04)] p-4 shadow-sm ${className}`}
      aria-label="다시 받기"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
        품질 · 톤
      </p>
      <h3 className="mt-1 text-[15px] font-bold tracking-tight text-[var(--vision-ink)]">
        마음에 안 들면 다시 받기
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
        조사와 브랜드 기억은 그대로 두고, 문장 구성과 표현만 새로 짭니다.
      </p>

      <label className="mt-3 block">
        <span className="text-[11px] font-medium text-[var(--vision-muted)]">
          이번엔 이렇게 <span className="font-normal">(선택)</span>
        </span>
        <input
          type="text"
          value={toneRequest}
          onChange={(e) => onToneRequestChange?.(e.target.value)}
          placeholder="예: 더 담백하게 · 사장님 말투 · 짧게"
          maxLength={120}
          className="mt-1.5 w-full rounded-xl border border-[var(--vision-line)] bg-white px-3 py-2.5 text-[13px] text-[var(--vision-ink)] placeholder:text-[var(--vision-muted)] focus:border-[rgba(48,209,88,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(48,209,88,0.12)]"
        />
      </label>

      {brandHabitsLine ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-[#03A94D]">
          브랜드 기억 · {brandHabitsLine}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onRegenerate?.()}
        disabled={busy}
        className={`${VISION_COPY_BTN} mt-3 w-full justify-center py-2.5 text-[13px] font-bold hover:border-[rgba(48,209,88,0.45)] hover:bg-[rgba(48,209,88,0.1)] hover:text-[#047a2a] disabled:opacity-50`}
      >
        {busy ? RETRY.ctaBusy : RETRY.cta}
      </button>

      {rewriteCount > 0 ? (
        <p className="mt-2 text-center text-[10px] text-[var(--vision-muted)]">
          이미 {rewriteCount}번 다시 받았어요
        </p>
      ) : null}
    </section>
  );
}
