"use client";

import { useMemo } from "react";
import { buildBriclogNextSnapshot } from "@/lib/product/briclogNext";
import {
  VISION_CTA_ACCENT,
  VISION_CTA_GHOST,
  VISION_EYEBROW,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

/**
 * Jobs: one scene — “지금 무엇을?” 한 문장 + CTA 하나.
 * Cook: public landing과 같은 editorial density.
 */
export default function TodayWorkspaceScene({
  blogInput = {},
  brandName = "",
  region = "",
  hasPlace = false,
  hasInsta = false,
  blogContent = null,
  onPrimaryAction,
  onSecondaryAction,
}) {
  const snapshot = useMemo(
    () =>
      buildBriclogNextSnapshot(
        {
          brandName: brandName || blogInput.brandName,
          region: region || blogInput.region,
          topic: blogInput.topic,
          contentOperatingPlan: blogInput.contentOperatingPlan,
        },
        {
          blog: Boolean(blogContent),
          place: hasPlace,
          insta: hasInsta,
          blogTopic:
            blogContent?.title ||
            blogContent?.representativeTitle ||
            blogInput.topic ||
            "",
        }
      ),
    [blogInput, brandName, region, hasPlace, hasInsta, blogContent]
  );

  const brand = (brandName || blogInput.brandName || "").trim();
  const topic =
    snapshot.primaryAction?.topic ||
    snapshot.plan?.primaryTopic ||
    blogInput.topic ||
    "";
  const verdict = topic
    ? `오늘 「${topic}」를 쓰세요.`
    : brand
      ? `오늘 ${brand}의 다음 이야기를 남기세요.`
      : "오늘, 남길 한 줄을 정하세요.";
  const ctaLabel = snapshot.primaryAction?.label || "이야기 쓰기";
  const menuId = snapshot.primaryAction?.menuId || "blog";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper,#FCFCFA)]"
      data-briclog-surface="today"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 md:px-10 md:py-16">
        <p className={`${VISION_EYEBROW} text-center`}>Today</p>
        <h1 className="mt-5 text-center text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--vision-ink,#111111)]">
          {verdict}
        </h1>
        <p className={`mx-auto mt-5 max-w-md text-center ${VISION_SUB}`}>
          {brand
            ? `${brand}${region || blogInput.region ? ` · ${region || blogInput.region}` : ""} — 30초 안에 오늘 할 일.`
            : "브랜드를 고르면, 오늘 쓸 주제가 한 문장으로 잡힙니다."}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className={VISION_CTA_ACCENT}
            onClick={() =>
              onPrimaryAction?.({
                menuId,
                topic: topic || "",
                label: ctaLabel,
              })
            }
          >
            {ctaLabel}
          </button>
          {typeof onSecondaryAction === "function" ? (
            <button
              type="button"
              className={VISION_CTA_GHOST}
              onClick={() => onSecondaryAction()}
            >
              Plans 보기
            </button>
          ) : null}
        </div>

        {snapshot.ok && snapshot.headline ? (
          <p className="mx-auto mt-8 max-w-lg text-center text-[13px] leading-relaxed text-[var(--vision-muted,#5F6B66)]">
            {snapshot.headline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
