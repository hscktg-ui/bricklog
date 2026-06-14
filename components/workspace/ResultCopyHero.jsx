"use client";

import {
  VISION_EYEBROW,
  VISION_RESULT_HERO,
  VISION_GHOST_BTN,
} from "@/lib/landing/vision2030Styles";

const STATUS_TONE = {
  ready: "text-[var(--vision-accent)]",
  polishing: "text-[#ff9500]",
  neutral: "text-[var(--vision-muted)]",
};

/**
 * 채널·블로그 결과 상단 — 복사·발행 준비 히어로 (Vision 2030)
 */
export default function ResultCopyHero({
  eyebrow = null,
  title,
  statusLabel = null,
  statusTone = "neutral",
  metaLine = null,
  hint = null,
  actions = null,
  footer = null,
  children = null,
  className = "",
}) {
  const statusClass = STATUS_TONE[statusTone] || STATUS_TONE.neutral;

  return (
    <div className={`${VISION_RESULT_HERO} p-4 md:p-5 ${className}`}>
      {eyebrow ? <p className={VISION_EYEBROW}>{eyebrow}</p> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--vision-ink)]">
            {title}
          </p>
          {statusLabel ? (
            <p className={`mt-1 text-[12px] font-semibold ${statusClass}`}>
              {statusLabel}
            </p>
          ) : null}
          {metaLine ? (
            <p className="mt-0.5 text-[11px] font-medium text-[var(--vision-muted)]">
              {metaLine}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--vision-muted)]">
          {hint}
        </p>
      ) : null}
      {children}
      {footer}
    </div>
  );
}

export function ResultCopyGhostButton({ children, className = "", ...props }) {
  return (
    <button type="button" className={`${VISION_GHOST_BTN} ${className}`} {...props}>
      {children}
    </button>
  );
}
