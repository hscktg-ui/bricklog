"use client";

import {
  buildContentOperatingPlan,
  buildPostPublishOperatingSteps,
} from "@/lib/product/briclogBrandContentOS";
import { WORKSPACE_BLOG } from "@/lib/product/craft";
import { VISION_EYEBROW, VISION_PANEL } from "@/lib/landing/vision2030Styles";

/**
 * Brand Content OS — 이번 달 운영안 (기획 30% 가치 노출)
 * @param {"before"|"after"} phase — 생성 전 vs 블로그 결과 후 다음 단계
 */
export default function ContentOperatingPlanPanel({
  blogInput = null,
  meta = {},
  compact = false,
  phase = "before",
  hasPlace = false,
  hasInsta = false,
  blogTopic = "",
}) {
  const plan =
    blogInput?.contentOperatingPlan ||
    (blogInput?.brandName || blogInput?.topic
      ? buildContentOperatingPlan(blogInput)
      : null);
  const headline =
    meta?.coreEngine?.operatingHeadline || plan?.operatingHeadline;

  const postSteps =
    phase === "after"
      ? buildPostPublishOperatingSteps(plan, {
          hasPlace,
          hasInsta,
          blogTopic:
            blogTopic ||
            meta?.primaryTopic ||
            plan?.primaryTopic ||
            blogInput?.topic ||
            "",
        })
      : [];

  const items =
    phase === "after"
      ? postSteps
      : plan?.whatToWrite?.slice(0, compact ? 3 : 4) || [];

  if (!items.length) return null;

  const panelClass = compact
    ? "rounded-xl border border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-3 py-3"
    : `${VISION_PANEL} px-4 py-4`;

  const eyebrow =
    phase === "after"
      ? "다음 운영 단계"
      : compact
        ? "이번 달 운영안 · 생성 전"
        : "이번 달 운영안";

  return (
    <section className={panelClass} aria-label={eyebrow}>
      <p
        className={
          compact
            ? "text-[10px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]"
            : VISION_EYEBROW
        }
      >
        {eyebrow}
      </p>
      {headline && phase !== "after" ? (
        <h3
          className={`${compact ? "mt-0.5 text-[14px]" : "mt-1 text-[15px]"} font-bold text-[var(--vision-ink)]`}
        >
          {headline}
        </h3>
      ) : null}
      {phase === "after" ? (
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
          네이버에 올린 뒤 같은 조사·브랜드 톤으로 이어갈 채널과 주제입니다.
        </p>
      ) : compact ? (
        <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
          아래 「{WORKSPACE_BLOG.cta}」 전에 이번 달에 쓸 주제·채널 방향을
          확인하세요.
        </p>
      ) : null}
      <ul className={`${compact ? "mt-2" : "mt-3"} space-y-2`}>
        {items.map((item) => (
          <li
            key={`${phase}-${item.channel}-${item.topic}`}
            className="rounded-lg bg-[var(--vision-paper,#F7F8FA)] px-3 py-2 text-[13px] leading-relaxed"
          >
            <span className="font-semibold text-[var(--vision-accent)]">
              {item.channelLabel || item.channel}
            </span>
            <span className="text-[var(--vision-ink)]"> — {item.topic}</span>
            {phase === "after" && item.actionLabel ? (
              <p className="mt-0.5 text-[12px] font-medium text-[var(--vision-muted)]">
                → {item.actionLabel}
              </p>
            ) : null}
            {phase !== "after" && !compact && item.reason ? (
              <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">
                {item.reason}
              </p>
            ) : null}
            {phase !== "after" && item.priority ? (
              <p className="mt-0.5 text-[11px] text-[var(--vision-muted)]">
                {item.priority}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {phase !== "after" && plan.researchMustKnow?.length ? (
        <p className="mt-3 text-[12px] text-[var(--vision-muted)]">
          조사 포인트:{" "}
          {plan.researchMustKnow.slice(0, compact ? 2 : 3).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
