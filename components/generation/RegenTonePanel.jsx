"use client";

import { useId } from "react";
import { RETRY } from "@/lib/product/craft";
import {
  REGEN_PANEL_COPY,
  REGEN_TONE_QUICK_PICKS,
  mergeToneQuickPick,
  regenCountLabel,
} from "@/lib/product/regenToneUx";
import {
  VISION_CTA_ACCENT,
  VISION_CHIP_ACTIVE,
  VISION_CHIP_IDLE,
  VISION_EYEBROW,
  VISION_INPUT,
  VISION_PANEL,
} from "@/lib/landing/vision2030Styles";

/**
 * 다시 받기 + 사용자 톤 요청 — PC·모바일 단일 SSOT
 * @param {{ variant?: "blog"|"place"|"instagram", compact?: boolean, mobile?: boolean, showBrandHabits?: boolean }} props
 */
export default function RegenTonePanel({
  variant = "blog",
  toneRequest = "",
  onToneRequestChange,
  onRegenerate,
  busy = false,
  brandHabitsLine = "",
  rewriteCount = 0,
  showBrandHabits = true,
  compact = false,
  mobile = false,
  className = "",
}) {
  const inputId = useId();
  const copy = REGEN_PANEL_COPY[variant] || REGEN_PANEL_COPY.blog;
  const picks = REGEN_TONE_QUICK_PICKS[variant] || REGEN_TONE_QUICK_PICKS.blog;
  const countLine = regenCountLabel(rewriteCount);
  const isTight = compact || mobile;

  const title = isTight ? copy.titleMobile : copy.title;
  const body = isTight ? copy.bodyMobile : copy.body;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!busy) onRegenerate?.();
  };

  const handlePick = (pick) => {
    onToneRequestChange?.(mergeToneQuickPick(toneRequest, pick));
  };

  return (
    <section
      className={`${VISION_PANEL} ${isTight ? "p-3.5" : "p-4 md:p-5"} ${className}`}
      aria-label={title}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <p className={VISION_EYEBROW}>{copy.eyebrow}</p>
          <h3
            className={`mt-1 font-bold tracking-tight text-[var(--vision-ink)] ${
              isTight ? "text-[14px]" : "text-[15px] md:text-[16px]"
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-1 leading-relaxed text-[var(--vision-muted)] ${
              isTight ? "text-[11px]" : "text-[12px] md:text-[13px]"
            }`}
          >
            {body}
          </p>
        </div>

        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="톤 빠른 선택"
        >
          {picks.map((pick) => {
            const active = String(toneRequest || "").includes(pick);
            return (
              <button
                key={pick}
                type="button"
                disabled={busy}
                onClick={() => handlePick(pick)}
                className={`briclog-pressable shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold transition disabled:opacity-50 ${
                  active ? VISION_CHIP_ACTIVE : VISION_CHIP_IDLE
                } ${mobile ? "min-h-[44px]" : "min-h-[36px]"}`}
              >
                {pick}
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor={inputId} className="text-[11px] font-medium text-[var(--vision-muted)]">
            {copy.toneLabel}{" "}
            <span className="font-normal text-[var(--vision-muted)]">(선택)</span>
          </label>
          <input
            id={inputId}
            type="text"
            enterKeyHint="go"
            value={toneRequest}
            onChange={(e) => onToneRequestChange?.(e.target.value)}
            placeholder={copy.placeholder}
            maxLength={120}
            disabled={busy}
            className={`${VISION_INPUT} mt-1.5 disabled:opacity-60 ${mobile ? "text-[16px]" : "text-[14px]"}`}
          />
        </div>

        {showBrandHabits && brandHabitsLine ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-[var(--vision-accent)]">
            브랜드 기억 · {brandHabitsLine}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`${VISION_CTA_ACCENT} ${isTight ? "min-h-[48px] text-[14px]" : "min-h-[52px] text-[15px]"}`}
        >
          {busy ? RETRY.ctaBusy : RETRY.cta}
        </button>

        {countLine ? (
          <p className="text-center text-[10px] text-[var(--vision-muted)]">{countLine}</p>
        ) : null}
      </form>
    </section>
  );
}
