"use client";

import { blogGenerateCtaInlineRetry } from "@/lib/product/blogCtaCopy";
import { VISION_CTA_ACCENT, VISION_PANEL, VISION_SUB } from "@/lib/landing/vision2030Styles";

/**
 * Writer-first withhold — 본문 없이 다시 받기만
 */
export default function BlogWithholdEmptyState({
  message,
  onRegenerate,
  busy = false,
  className = "",
}) {
  const copy =
    message ||
    `조사는 반영됐지만 이번 초안이 품질 기준에 못 미쳤어요. ${blogGenerateCtaInlineRetry()}`;

  return (
    <div
      className={`mx-auto max-w-lg px-4 py-10 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`${VISION_PANEL} px-6 py-10`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--vision-muted)]">
          품질 기준
        </p>
        <p className={`mt-4 ${VISION_SUB}`}>{copy}</p>
        {onRegenerate ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRegenerate}
            className={`${VISION_CTA_ACCENT} mt-8`}
          >
            {busy ? "다시 받는 중…" : "다시 받기"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
