"use client";

import { MOBILE_STORY } from "@/lib/product/craft";

function SegmentLabel({ icon, text, busy = false }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {icon ? (
        <span className="text-[14px] leading-none" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{text}</span>
      {busy ? (
        <span
          className="briclog-spinner h-3.5 w-3.5 border-[#03C75A]/25 border-t-[#03C75A]"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

/**
 * 모바일 이야기 쓰기 — 입력 / 원고, 한 번에 한 화면
 * @param {"form"|"story"} pane
 */
export default function MobileStoryChrome({
  pane = "form",
  onPaneChange,
  storyReady = false,
  isGenerating = false,
  storyTitle = null,
}) {
  const storyDisabled = !storyReady && !isGenerating;

  return (
    <div className="shrink-0 border-b border-[#E8EBED]/80 bg-white/98 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div
        className="flex rounded-[14px] bg-[#EEF0F3]/90 p-1"
        role="tablist"
        aria-label="이야기 쓰기"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === "form"}
          disabled={isGenerating}
          onClick={() => !isGenerating && onPaneChange?.("form")}
          className={`min-h-[48px] flex-1 rounded-[11px] text-[14px] font-bold transition-all duration-200 ease-out ${
            pane === "form"
              ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              : "text-[#8B95A1]"
          } disabled:opacity-40`}
        >
          <SegmentLabel
            icon={MOBILE_STORY.segmentFormIcon}
            text={MOBILE_STORY.segmentForm}
          />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "story"}
          disabled={storyDisabled}
          onClick={() => !storyDisabled && onPaneChange?.("story")}
          className={`relative min-h-[48px] flex-1 rounded-[11px] text-[14px] font-bold transition-all duration-200 ease-out ${
            pane === "story"
              ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              : storyDisabled
                ? "text-[#C5CAD0]"
                : "text-[#8B95A1]"
          }`}
        >
          {isGenerating ? (
            <SegmentLabel
              icon={MOBILE_STORY.segmentBusyIcon}
              text={MOBILE_STORY.segmentBusy}
              busy
            />
          ) : (
            <SegmentLabel
              icon={MOBILE_STORY.segmentStoryIcon}
              text={MOBILE_STORY.segmentStory}
            />
          )}
          {storyReady && !isGenerating ? (
            <span
              className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#03C75A] ring-[3px] ring-[#03C75A]/15"
              aria-hidden
            />
          ) : null}
        </button>
      </div>
      {pane === "story" && storyTitle && !isGenerating ? (
        <p className="mt-2.5 truncate px-1 text-center text-[11px] font-medium text-[#8B95A1]">
          {storyTitle}
        </p>
      ) : pane === "form" && !isGenerating ? (
        <p className="mt-2.5 text-center text-[11px] font-medium tracking-wide text-[#B0B8C1]">
          {MOBILE_STORY.tagline}
        </p>
      ) : null}
    </div>
  );
}
