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
export default function DeliveryTrustBadge({
  pack,
  channel = "blog",
  className = "",
  compact = false,
  withheld = false,
  withholdMessage = "",
}) {
  if (withheld) {
    return (
      <div
        className={`${VISION_STATUS_NEUTRAL} ${compact ? "px-3 py-2.5" : "px-4 py-3"} ${className}`}
        role="status"
      >
        <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
          품질 기준 미달 — 본문을 올리지 않았어요
        </p>
        <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
          {withholdMessage || "다시 받기로 새 초안을 받아 주세요."}
        </p>
      </div>
    );
  }

  if (!pack?.sections?.length && !pack?.body && !pack?.title) return null;

  const badge = resolveDeliveryTrustBadge(pack, { channel });
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
