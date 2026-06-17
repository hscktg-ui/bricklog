"use client";

import { resolveDeliveryTrustBadge } from "@/lib/product/deliveryTrustDisplay";
import {
  VISION_STATUS_NEUTRAL,
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";

const TONE_CLASS = {
  ready: VISION_STATUS_OK,
  review: "rounded-xl border border-[#FFE8B2] bg-[#FFFBF0]",
  reference: VISION_STATUS_NEUTRAL,
};

const DOT = {
  publish: "🟢",
  polish: "🟡",
  reference: "⚪",
};

/**
 * 송출 신뢰 등급 — 발행 가능 / 다듬기 / 참고용
 */
export default function DeliveryTrustBadge({ pack, className = "", compact = false }) {
  if (!pack?.sections?.length) return null;

  const badge = resolveDeliveryTrustBadge(pack);
  const panelClass = TONE_CLASS[badge.tone] || VISION_STATUS_NEUTRAL;

  return (
    <div
      className={`${panelClass} ${compact ? "px-3 py-2.5" : "px-4 py-3"} ${className}`}
      role="status"
      aria-label={`편집본 등급: ${badge.label}`}
    >
      <p
        className={`font-semibold text-[var(--vision-ink)] ${
          compact ? "text-[12px]" : "text-[13px]"
        }`}
      >
        <span aria-hidden className="mr-1.5">
          {DOT[badge.tier] || "•"}
        </span>
        {badge.label}
        {!compact && badge.shortLabel !== badge.label ? (
          <span className="ml-1.5 font-normal text-[var(--vision-muted)]">
            · {badge.shortLabel}
          </span>
        ) : null}
      </p>
      <p
        className={`mt-1 leading-relaxed text-[var(--vision-muted)] ${
          compact ? "text-[11px]" : "text-[12px]"
        }`}
      >
        {badge.hint}
      </p>
    </div>
  );
}
