"use client";

/**
 * 채널 폼 상단 안내 — PC는 상세, 모바일은 한 줄
 */
export default function WorkspaceChannelIntro({
  title,
  description,
  compact = false,
  warning,
}) {
  return (
    <header className={compact ? "space-y-1" : "space-y-2"}>
      <h2
        className={
          compact
            ? "text-[16px] font-bold text-[#191F28]"
            : "text-[18px] font-bold text-[#191F28]"
        }
      >
        {title}
      </h2>
      {!compact && description ? (
        <p className="text-[13px] leading-relaxed text-[#8B95A1]">{description}</p>
      ) : null}
      {compact && description ? (
        <p className="text-[12px] leading-snug text-[#8B95A1] line-clamp-2">
          {description}
        </p>
      ) : null}
      {warning ? (
        <p className="text-[11px] text-[#E67700]">{warning}</p>
      ) : null}
    </header>
  );
}
