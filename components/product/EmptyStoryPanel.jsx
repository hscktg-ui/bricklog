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
  const body = mobile ? MOBILE_STORY.emptyBody : EMPTY_STORY.body;
  const footer = mobile ? MOBILE_STORY.emptyFooter : EMPTY_STORY.footer;

  return (
    <div
      className={`mx-auto flex max-w-md flex-col items-center px-4 text-center ${
        mobile ? "py-10" : "py-16"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F9EF] ring-1 ring-[#03C75A]/15">
        <Icon name="document" className="h-7 w-7 text-[#03A94D]" />
      </div>
      <p className="mt-5 text-[17px] font-bold text-[#191F28]">
        {EMPTY_STORY.title}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4E5968]">{body}</p>
      {hint ? (
        <p className="mt-3 text-[12px] text-[#8B95A1]">{hint}</p>
      ) : null}
      {onOpenHistory ? (
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#03C75A]/40 bg-[#F8FDF9] px-4 py-2.5 text-[13px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF]"
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
        <p className="mt-4 text-[11px] text-[#B0B8C1]">{footer}</p>
      )}
    </div>
  );
}
