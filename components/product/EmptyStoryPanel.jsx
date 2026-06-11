"use client";

import Icon from "@/components/Icon";
import { EMPTY_STORY, MOBILE_STORY } from "@/lib/product/craft";

export default function EmptyStoryPanel({
  compact = false,
  mobile = false,
  hint = null,
  onOpenHistory = null,
  historyLabel = null,
}) {
  const title = mobile ? MOBILE_STORY.emptyTitle : EMPTY_STORY.title;
  const body = mobile ? MOBILE_STORY.emptyBody : EMPTY_STORY.body;
  const footer = mobile ? MOBILE_STORY.emptyFooter : EMPTY_STORY.footer;

  return (
    <div
      className={`mx-auto flex max-w-sm flex-col items-center px-5 text-center ${
        mobile ? "py-12" : "py-20"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-[18px] bg-gradient-to-b from-[#E8F9EF] to-white ring-1 ring-[#03C75A]/12 shadow-[0_8px_24px_rgba(3,199,90,0.08)] ${
          mobile ? "h-[72px] w-[72px] text-[32px]" : "h-16 w-16"
        }`}
        aria-hidden
      >
        {mobile ? "✨" : null}
        {!mobile ? (
          <Icon name="document" className="h-7 w-7 text-[#03A94D]" />
        ) : null}
      </div>
      <p
        className={`mt-6 font-bold tracking-tight text-[#191F28] ${
          mobile ? "text-[20px]" : "text-[18px]"
        }`}
      >
        {title}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-[#4E5968]">{body}</p>
      {hint ? (
        <p className="mt-3 text-[12px] text-[#8B95A1]">{hint}</p>
      ) : null}
      {onOpenHistory ? (
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#E8EBED] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#4E5968] shadow-sm transition hover:border-[#03C75A]/30 hover:text-[#03A94D]"
        >
          <Icon name="clock" className="h-4 w-4" />
          <span className="max-w-[240px] truncate">
            {historyLabel
              ? `${EMPTY_STORY.historyCta} · ${historyLabel}`
              : EMPTY_STORY.historyCta}
          </span>
        </button>
      ) : null}
      {!compact && (
        <p className="mt-5 text-[11px] font-medium text-[#B0B8C1]">{footer}</p>
      )}
    </div>
  );
}
