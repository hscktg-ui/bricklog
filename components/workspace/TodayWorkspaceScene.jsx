"use client";

import { useMemo } from "react";
import {
  buildBriclogNextSnapshot,
  buildTodayVerdict,
} from "@/lib/product/briclogNext";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_SUB,
  VISION_TEXT_LINK,
} from "@/lib/landing/vision2030Styles";

/**
 * Vision 2040 Today — Jobs: one sentence · one CTA · Cook: landing density.
 */
export default function TodayWorkspaceScene({
  blogInput = {},
  brandName = "",
  region = "",
  industry = "",
  hasPlace = false,
  hasInsta = false,
  blogContent = null,
  onPrimaryAction,
  onSecondaryAction,
}) {
  const brand = (brandName || blogInput.brandName || "").trim();
  const regionLine = (region || blogInput.region || "").trim();

  const snapshot = useMemo(
    () =>
      buildBriclogNextSnapshot(
        {
          brandName: brand,
          region: regionLine,
          industry: industry || blogInput.industry || "",
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
    [blogInput, brand, regionLine, industry, hasPlace, hasInsta, blogContent]
  );

  const today = useMemo(
    () => buildTodayVerdict(snapshot, { brandName: brand }),
    [snapshot, brand]
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper,#FCFCFA)]"
      data-briclog-surface="today"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-14 md:px-10 md:py-20">
        <p className={`${VISION_EYEBROW} text-center`}>오늘</p>
        <h1 className="mt-6 text-center text-[clamp(2rem,5.5vw,3.2rem)] font-semibold leading-[1.14] tracking-[-0.01em] text-[var(--vision-ink,#111111)]">
          {today.verdict}
        </h1>
        <p className={`mx-auto mt-6 max-w-md text-center ${VISION_SUB}`}>
          {brand
            ? `${brand}${regionLine ? ` · ${regionLine}` : ""}`
            : "브랜드를 고르면, 오늘 쓸 주제가 한 문장으로 잡힙니다."}
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            type="button"
            className={VISION_CTA_ACCENT}
            onClick={() =>
              onPrimaryAction?.({
                menuId: today.menuId,
                topic: today.topic,
                label: today.ctaLabel,
              })
            }
          >
            {today.ctaLabel}
          </button>
          {typeof onSecondaryAction === "function" ? (
            <button
              type="button"
              className={VISION_TEXT_LINK}
              onClick={() => onSecondaryAction()}
            >
              Plans 보기
            </button>
          ) : null}
        </div>

        {today.headline ? (
          <p className="mx-auto mt-10 max-w-lg text-center text-[13px] leading-[1.7] text-[var(--vision-muted,#5F6B66)]">
            {today.headline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
