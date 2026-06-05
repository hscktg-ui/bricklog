"use client";

import { MOBILE_STORY } from "@/lib/product/craft";

/**
 * 모바일 이야기 쓰기 — iOS 스타일 주제/편집본 전환 (한 번에 한 화면)
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
    <div className="shrink-0 border-b border-[#E8EBED] bg-white/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <div
        className="flex rounded-xl bg-[#F0F2F5] p-1"
        role="tablist"
        aria-label="이야기 쓰기 화면"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === "form"}
          disabled={isGenerating}
          onClick={() => !isGenerating && onPaneChange?.("form")}
          className={`min-h-[44px] flex-1 rounded-lg text-[13px] font-semibold transition-all ${
            pane === "form"
              ? "bg-white text-[#191F28] shadow-sm"
              : "text-[#8B95A1]"
          } disabled:opacity-40`}
        >
          {MOBILE_STORY.segmentForm}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "story"}
          disabled={storyDisabled}
          onClick={() => !storyDisabled && onPaneChange?.("story")}
          className={`relative min-h-[44px] flex-1 rounded-lg text-[13px] font-semibold transition-all ${
            pane === "story"
              ? "bg-white text-[#191F28] shadow-sm"
              : storyDisabled
                ? "text-[#B0B8C1]"
                : "text-[#8B95A1]"
          }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {isGenerating ? (
              <>
                <span
                  className="briclog-spinner h-3.5 w-3.5 border-[#03C75A]/25 border-t-[#03C75A]"
                  aria-hidden
                />
                {MOBILE_STORY.segmentBusy}
              </>
            ) : (
              MOBILE_STORY.segmentStory
            )}
          </span>
          {storyReady && !isGenerating ? (
            <span
              className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#03C75A]"
              aria-hidden
            />
          ) : null}
        </button>
      </div>
      {pane === "story" && storyTitle && !isGenerating ? (
        <p className="mt-2 truncate text-center text-[11px] font-medium text-[#8B95A1]">
          {storyTitle}
        </p>
      ) : null}
    </div>
  );
}
