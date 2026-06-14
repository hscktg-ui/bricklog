"use client";

import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { VISION_EYEBROW, VISION_PANEL } from "@/lib/landing/vision2030Styles";

/**
 * Brand Content OS — 이번 달 운영안 (기획 30% 가치 노출)
 */
export default function ContentOperatingPlanPanel({ blogInput = null, meta = {} }) {
  const plan =
    blogInput?.contentOperatingPlan ||
    (blogInput?.brandName || blogInput?.topic
      ? buildContentOperatingPlan(blogInput)
      : null);
  const headline =
    meta?.coreEngine?.operatingHeadline || plan?.operatingHeadline;
  if (!plan?.whatToWrite?.length) return null;

  return (
    <section className={`${VISION_PANEL} px-4 py-4`} aria-label="이번 달 운영안">
      <p className={VISION_EYEBROW}>이번 달 운영안</p>
      {headline ? (
        <h3 className="mt-1 text-[15px] font-bold text-[var(--vision-ink)]">
          {headline}
        </h3>
      ) : null}
      <ul className="mt-3 space-y-2">
        {plan.whatToWrite.slice(0, 4).map((item) => (
          <li
            key={`${item.channel}-${item.topic}`}
            className="rounded-lg bg-[var(--vision-paper,#F7F8FA)] px-3 py-2 text-[13px] leading-relaxed"
          >
            <span className="font-semibold text-[var(--vision-accent)]">
              {item.channel}
            </span>
            <span className="text-[var(--vision-ink)]"> — {item.topic}</span>
            {item.reason ? (
              <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">
                {item.reason}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {plan.researchMustKnow?.length ? (
        <p className="mt-3 text-[12px] text-[var(--vision-muted)]">
          조사 포인트: {plan.researchMustKnow.slice(0, 3).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
