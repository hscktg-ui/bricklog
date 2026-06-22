"use client";

import {
  VISION_CTA_GHOST,
  VISION_PANEL,
  VISION_STATUS_OK,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  insta: "인스타",
};

function previewLine(channel, pack) {
  if (!pack) return "준비 중";
  if (channel === "blog") {
    return pack.representativeTitle || pack.title || pack.sections?.[0]?.heading || "이야기";
  }
  if (channel === "place") {
    return pack.title || pack.shortNotice || "플레이스";
  }
  return pack.hook || pack.lineBreakBody?.split("\n")[0] || "인스타";
}

/**
 * 오늘 운영 3채널 완료 — Jobs식 한 화면 마무리
 */
export default function TodayOperationsComplete({
  blog,
  place,
  insta,
  onViewChannel,
  onGoPlan,
  onDismiss,
  className = "",
}) {
  const cards = [
    { id: "blog", pack: blog },
    { id: "place", pack: place },
    { id: "insta", pack: insta },
  ].filter((c) => c.pack);

  if (!cards.length) return null;

  return (
    <div
      className={`${VISION_STATUS_OK} ${className}`}
      role="status"
      aria-label="오늘 운영 완료"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-accent-deep,#03a94d)]">
        오늘 운영 완료
      </p>
      <p className="mt-2 text-[15px] font-semibold text-[var(--vision-ink)]">
        이야기 · 플레이스 · 인스타가 준비됐어요
      </p>
      <p className={`mt-1 ${VISION_SUB} !text-[14px]`}>
        운영 계획 캘린더에 반영됐습니다. 복사하거나 채널별로 확인해 보세요.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {cards.map(({ id, pack }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChannel?.(id)}
            className={`${VISION_PANEL} min-h-[72px] px-3 py-3 text-left transition hover:border-[var(--vision-accent-ring)]`}
          >
            <p className="text-[11px] font-semibold text-[var(--vision-muted)]">
              {CHANNEL_LABEL[id]}
            </p>
            <p className="mt-1 line-clamp-2 text-[13px] font-medium text-[var(--vision-ink)]">
              {previewLine(id, pack)}
            </p>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onGoPlan ? (
          <button type="button" onClick={onGoPlan} className={VISION_CTA_GHOST}>
            운영 계획 보기
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] rounded-full px-4 text-[13px] font-semibold text-[var(--vision-muted)] hover:text-[var(--vision-ink)]"
          >
            닫기
          </button>
        ) : null}
      </div>
    </div>
  );
}
