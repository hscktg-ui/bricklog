"use client";

import { blogGenerateCtaInlineRetry } from "@/lib/product/blogCtaCopy";
import { VISION_CTA_ACCENT, VISION_PANEL, VISION_SUB } from "@/lib/landing/vision2030Styles";

/**
 * Writer-first withhold — 본문 없이 다시 받기 + 다음 행동 안내
 */
export default function BlogWithholdEmptyState({
  message,
  onRegenerate,
  onEditInputs,
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
        <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-[13px] leading-relaxed text-[var(--vision-muted)]">
          <li>· 브랜드·지역·주제를 한 줄씩 더 구체적으로 적어 보세요.</li>
          <li>· 업종·매장 특징이 비어 있으면 채워 주세요.</li>
          <li>· 다시 받으면 같은 조사로 문장만 다시 맞춥니다.</li>
        </ul>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {onRegenerate ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRegenerate}
              className={`${VISION_CTA_ACCENT} !w-auto min-w-[140px]`}
            >
              {busy ? "다시 받는 중…" : "다시 받기"}
            </button>
          ) : null}
          {onEditInputs ? (
            <button
              type="button"
              disabled={busy}
              onClick={onEditInputs}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--vision-line)] bg-white px-5 text-[14px] font-semibold text-[var(--vision-ink)] hover:bg-[var(--vision-paper)]"
            >
              입력 다시 다듬기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
