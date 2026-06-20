"use client";

import { VISION_EYEBROW, VISION_SUB } from "@/lib/landing/vision2030Styles";

/**
 * 채널 폼 상단 안내 — PC는 상세, 모바일은 한 줄
 */
export default function WorkspaceChannelIntro({
  title,
  description,
  compact = false,
  warning,
  eyebrow,
}) {
  return (
    <header className={compact ? "space-y-1" : "space-y-2"}>
      {eyebrow ? (
        <p className={compact ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]" : VISION_EYEBROW}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={
          compact
            ? "text-[16px] font-semibold tracking-tight text-[var(--vision-ink)]"
            : "text-[18px] font-semibold tracking-tight text-[var(--vision-ink)]"
        }
      >
        {title}
      </h2>
      {!compact && description ? (
        <p className={`${VISION_SUB} !text-[13px]`}>{description}</p>
      ) : null}
      {compact && description ? (
        <p className="text-[12px] leading-snug text-[var(--vision-muted)] line-clamp-2">
          {description}
        </p>
      ) : null}
      {warning ? (
        <p className="text-[11px] text-[#E67700]">{warning}</p>
      ) : null}
    </header>
  );
}
