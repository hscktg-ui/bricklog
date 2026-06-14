"use client";

import Icon from "@/components/Icon";
import {
  PASTE_REVIEW_ENTRY_BODY,
  PASTE_REVIEW_ENTRY_CTA,
  PASTE_REVIEW_ENTRY_TITLE,
} from "@/lib/product/briclogPerspectiveCopy";

/** 민감 업종·기존 원고 보유 — 검수 스튜디오 진입 */
export default function PasteReviewEntryCard({ onOpenReview, className = "" }) {
  if (typeof onOpenReview !== "function") return null;

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-white px-3 py-3 ${className}`}
      role="region"
      aria-label="원고 검수"
    >
      <p className="text-[12px] font-semibold text-[var(--vision-ink,#191F28)]">
        {PASTE_REVIEW_ENTRY_TITLE}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--vision-muted,#8B95A1)]">
        {PASTE_REVIEW_ENTRY_BODY}
      </p>
      <button
        type="button"
        onClick={onOpenReview}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--vision-accent,#03C75A)] hover:underline"
      >
        <Icon name="eye" className="h-4 w-4" aria-hidden />
        {PASTE_REVIEW_ENTRY_CTA}
      </button>
    </div>
  );
}
