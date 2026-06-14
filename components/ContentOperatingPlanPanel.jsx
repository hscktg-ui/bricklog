"use client";

import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { VISION_EYEBROW, VISION_PANEL } from "@/lib/landing/vision2030Styles";

/**
 * Brand Content OS — 이번 달 운영안 (기획 30% 가치 노출)
 */
export default function ContentOperatingPlanPanel({
  blogInput = null,
  meta = {},
  compact = false,
}) {
  const plan =
    blogInput?.contentOperatingPlan ||
    (blogInput?.brandName || blogInput?.topic
      ? buildContentOperatingPlan(blogInput)
      : null);
  const headline =
    meta?.coreEngine?.operatingHeadline || plan?.operatingHeadline;
  if (!plan?.whatToWrite?.length) return null;

  const panelClass = compact
    ? "rounded-xl border border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-3 py-3"
    : `${VISION_PANEL} px-4 py-4`;

  return (
    <section className={panelClass} aria-label="이번 달 운영안">
      <p className={compact ? "text-[10px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]" : VISION_EYEBROW}>
        {compact ? "이번 달 운영안 · 생성 전" : "이번 달 운영안"}
      </p>
      {headline ? (
        <h3
          className={`${compact ? "mt-0.5 text-[14px]" : "mt-1 text-[15px]"} font-bold text-[var(--vision-ink)]`}
        >
          {headline}
        </h3>
      ) : null}
      {compact ? (
        <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
          아래 「AI 조사 시작」 전에 이번 달에 쓸 주제·채널 방향을 확인하세요.
        </p>
      ) : null}
      <ul className={`${compact ? "mt-2" : "mt-3"} space-y-2`}>
        {plan.whatToWrite.slice(0, compact ? 3 : 4).map((item) => (
          <li
            key={`${item.channel}-${item.topic}`}
            className="rounded-lg bg-[var(--vision-paper,#F7F8FA)] px-3 py-2 text-[13px] leading-relaxed"
          >
            <span className="font-semibold text-[var(--vision-accent)]">
              {item.channel}
            </span>
            <span className="text-[var(--vision-ink)]"> — {item.topic}</span>
            {!compact && item.reason ? (
              <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">
                {item.reason}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {plan.researchMustKnow?.length ? (
        <p className="mt-3 text-[12px] text-[var(--vision-muted)]">
          조사 포인트: {plan.researchMustKnow.slice(0, compact ? 2 : 3).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
