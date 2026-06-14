"use client";

import { MOBILE_CHANNEL_COPY } from "@/lib/workspace/channelWorkspaceLayout";

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
          className="briclog-spinner h-3.5 w-3.5 border-[var(--vision-line)] border-t-[var(--vision-accent)]"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

/**
 * 모바일 채널 작업실 — 브리프 / 결과, 한 번에 한 화면
 * @param {"blog"|"place"|"insta"} channel
 * @param {"form"|"result"} pane
 */
export default function MobileChannelChrome({
  channel = "blog",
  pane = "form",
  onPaneChange,
  resultReady = false,
  isGenerating = false,
  resultTitle = null,
}) {
  const copy = MOBILE_CHANNEL_COPY[channel] || MOBILE_CHANNEL_COPY.blog;
  const resultDisabled = !resultReady && !isGenerating;

  return (
    <div className="shrink-0 border-b border-[var(--vision-line)] bg-[var(--vision-glass-strong)] px-4 py-3 backdrop-blur-xl lg:hidden">
      <div
        className="flex rounded-full border border-[var(--vision-line)] bg-[var(--vision-paper)] p-1"
        role="tablist"
        aria-label={copy.ariaLabel}
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === "form"}
          disabled={isGenerating}
          onClick={() => !isGenerating && onPaneChange?.("form")}
          className={`min-h-[48px] flex-1 rounded-full text-[14px] font-semibold transition-all duration-200 ease-out ${
            pane === "form"
              ? "bg-white text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)]"
              : "text-[var(--vision-muted)]"
          } disabled:opacity-40`}
        >
          <SegmentLabel icon={copy.form.icon} text={copy.form.label} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "result"}
          disabled={resultDisabled}
          onClick={() => !resultDisabled && onPaneChange?.("result")}
          className={`relative min-h-[48px] flex-1 rounded-full text-[14px] font-semibold transition-all duration-200 ease-out ${
            pane === "result"
              ? "bg-white text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)]"
              : resultDisabled
                ? "text-[var(--vision-muted)]/50"
                : "text-[var(--vision-muted)]"
          }`}
        >
          {isGenerating ? (
            <SegmentLabel
              icon={copy.busy.icon}
              text={copy.busy.label}
              busy
            />
          ) : (
            <SegmentLabel icon={copy.result.icon} text={copy.result.label} />
          )}
          {resultReady && !isGenerating ? (
            <span
              className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--vision-accent)] ring-[3px] ring-[rgba(48,209,88,0.15)]"
              aria-hidden
            />
          ) : null}
        </button>
      </div>
      {pane === "result" && resultTitle && !isGenerating ? (
        <p className="mt-2.5 truncate px-1 text-center text-[11px] font-medium text-[var(--vision-muted)]">
          {resultTitle}
        </p>
      ) : pane === "form" && !isGenerating ? (
        <p className="mt-2.5 text-center text-[11px] font-medium tracking-wide text-[var(--vision-muted)]">
          {copy.tagline}
        </p>
      ) : null}
    </div>
  );
}
