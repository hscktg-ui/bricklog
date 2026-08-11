"use client";

import {
  buildBriclogNextSnapshot,
  getBriclogNextPublicPitch,
} from "@/lib/product/briclogNext";
import { VISION_CTA_ACCENT, VISION_EYEBROW, VISION_PANEL } from "@/lib/landing/vision2030Styles";

/**
 * 브릭로그 다음 — 이번 달 운영 리듬·발행 후 다음 채널
 */
export default function BriclogNextPanel({
  blogInput = null,
  meta = {},
  compact = false,
  hero = false,
  hasPlace = false,
  hasInsta = false,
  blogTopic = "",
  onChannelAction = null,
  showProgress = true,
}) {
  const snapshot = buildBriclogNextSnapshot(blogInput || {}, {
    blog: Boolean(blogTopic || meta?.primaryTopic || blogInput?.topic),
    place: hasPlace,
    insta: hasInsta,
    blogTopic:
      blogTopic ||
      meta?.primaryTopic ||
      blogInput?.topic ||
      "",
  });

  if (!snapshot.ok) return null;

  const headline = meta?.coreEngine?.operatingHeadline || snapshot.headline;
  const panelClass = hero
    ? `${VISION_PANEL} px-4 py-4 sm:px-5 sm:py-5`
    : compact
      ? "rounded-xl border border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-3 py-3"
      : `${VISION_PANEL} px-4 py-4`;

  const handleAction = (channel) => {
    if (typeof onChannelAction === "function") onChannelAction(channel);
  };

  return (
    <section className={panelClass} aria-label="브릭로그 다음">
      <p
        className={
          compact && !hero
            ? "text-[10px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]"
            : VISION_EYEBROW
        }
      >
        브릭로그 다음 · {snapshot.month}
      </p>
      {headline && (!compact || hero) ? (
        <h3 className={`mt-1 font-bold text-[var(--vision-ink)] ${hero ? "text-[16px]" : "text-[15px]"}`}>
          {headline}
        </h3>
      ) : null}
      <p className={`mt-1 leading-relaxed text-[var(--vision-muted)] ${hero ? "text-[13px]" : "text-[12px]"}`}>
        네이버에 올린 뒤 같은 조사·브랜드 톤으로 이어갈 채널과 주제입니다.
      </p>

      {showProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-[var(--vision-muted)]">
            <span>이번 달 채널</span>
            <span className="font-semibold text-[var(--vision-ink)]">
              {snapshot.doneCount}/{snapshot.totalChannels}
            </span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--vision-line,#E8EBED)]"
            role="progressbar"
            aria-valuenow={snapshot.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--vision-accent,#03C75A)] transition-all"
              style={{ width: `${snapshot.progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {snapshot.rhythm.map((item) => (
              <span
                key={item.channel}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  item.done
                    ? "bg-[#E8F9EF] text-[#03A94D]"
                    : "bg-[var(--vision-paper)] text-[var(--vision-muted)]"
                }`}
              >
                {item.label}
                {item.done ? " ✓" : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <ul className={`${compact ? "mt-2" : "mt-3"} space-y-2`}>
        {snapshot.steps.map((item) => (
          <li
            key={`next-${item.channel}-${item.topic}`}
            className="rounded-lg bg-[var(--vision-paper,#F7F8FA)] px-3 py-2.5 text-[13px] leading-relaxed"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--vision-accent)]">
                  {item.channelLabel || item.channel}
                </span>
                <span className="text-[var(--vision-ink)]"> — {item.topic}</span>
                {item.actionLabel ? (
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--vision-muted)]">
                    → {item.actionLabel}
                  </p>
                ) : null}
              </div>
              {typeof onChannelAction === "function" &&
              item.channel !== "blog" ? (
                <button
                  type="button"
                  onClick={() => handleAction(item.channel)}
                  className={
                    compact
                      ? "shrink-0 rounded-lg bg-[var(--vision-accent,#03C75A)] px-3 py-1.5 text-[11px] font-semibold text-white"
                      : `${VISION_CTA_ACCENT} shrink-0 !min-h-0 !px-3 !py-1.5 !text-[12px]`
                  }
                >
                  이어 만들기
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {snapshot.actions ? (
        <div className={`${compact ? "mt-2" : "mt-3"} space-y-2 rounded-lg border border-[var(--vision-line)] bg-white/70 px-3 py-2.5`}>
          <p className="text-[11px] font-semibold text-[var(--vision-muted)]">
            {snapshot.actions.headline || "다음에 할 일"}
          </p>
          {snapshot.actions.nextTopics?.length ? (
            <ul className="space-y-1">
              {snapshot.actions.nextTopics.map((t) => (
                <li key={t} className="text-[12px] text-[var(--vision-ink)] before:mr-1 before:content-['·']">
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
          {snapshot.actions.avoidPhrases?.length ? (
            <p className="text-[11px] text-[#D14343]">
              피하기: {snapshot.actions.avoidPhrases.join(" · ")}
            </p>
          ) : null}
          {snapshot.actions.channelMix?.length ? (
            <p className="text-[11px] text-[var(--vision-muted)]">
              채널 믹스:{" "}
              {snapshot.actions.channelMix
                .map((c) => `${c.label || c.channel}`)
                .join(" → ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {snapshot.primaryAction && typeof onChannelAction === "function" ? (
        <button
          type="button"
          onClick={() => handleAction(snapshot.primaryAction.channel)}
          className={`${VISION_CTA_ACCENT} mt-3 w-full sm:w-auto`}
        >
          {snapshot.primaryAction.channelLabel} {snapshot.primaryAction.label}
        </button>
      ) : null}
    </section>
  );
}

/** 랜딩 전용 — 정적 피치 카드 */
export function BriclogNextPitchGrid({ className = "" }) {
  const pitch = getBriclogNextPublicPitch();
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 ${className}`}>
      {pitch.pillars.map((item, i) => (
        <article
          key={item.title}
          className="rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-6 shadow-[var(--vision-shadow-soft)]"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--vision-accent)] text-[11px] font-bold text-[#071510]">
            {i + 1}
          </span>
          <h3 className="mt-3 text-[17px] font-semibold text-[var(--vision-ink)]">
            {item.title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--vision-muted)]">
            {item.desc}
          </p>
        </article>
      ))}
    </div>
  );
}
