"use client";

import { useState } from "react";
import { CUSTOMER_SAMPLE_BADGE } from "@/lib/copy/customerFacing";
import { LANDING_SAMPLE } from "@/lib/landing/sampleContent";
import {
  SampleBlogPreview,
  SampleInstaPreview,
  SamplePlacePreview,
} from "@/components/landing/SamplePreviewBlocks";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import { LANDING_PRIMARY_CTA, LANDING_PRIMARY_SUB } from "@/lib/landing/ctaCopy";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SECTION,
  VISION_SUB,
  VISION_TAB_ACTIVE,
  VISION_TAB_IDLE,
} from "@/lib/landing/vision2030Styles";

const TABS = [
  { id: "blog", label: "이야기" },
  { id: "place", label: "플레이스" },
  { id: "insta", label: "인스타" },
];

export default function DemoPreviewSection({ sample, onTest }) {
  const s = sample ?? LANDING_SAMPLE;
  const [tab, setTab] = useState("blog");

  return (
    <section
      id="landing-sample"
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-3xl">
        <p className={`${VISION_EYEBROW} text-center`}>Sample</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          운영 글은 한 주제
        </h2>
        <p className={`mt-4 text-center ${VISION_SUB}`}>
          이야기 · 플레이스 · 인스타. 상품 화면은 같은 주제가 아닙니다.{" "}
          <a href="/#landing-detail-sample" className="font-semibold text-[var(--vision-ink)] underline-offset-2 hover:underline">
            브릭로그 상세
          </a>
          샘플 존에서 맛보기를 보고 만듭니다.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex-1 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg)] px-4 py-3.5 text-[14px] text-[var(--vision-muted)] shadow-[var(--vision-shadow-soft)]">
            <span className="font-semibold text-[var(--vision-ink)]">{s.brand.name}</span>
            {s.brand.region ? (
              <>
                <span className="text-[var(--vision-muted)]"> · </span>
                {s.brand.region}
              </>
            ) : null}
            <span className="text-[var(--vision-muted)]"> · </span>
            {s.topic}
          </p>
          <span className="hidden shrink-0 self-start rounded-full bg-[var(--vision-accent-deep)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white lg:inline-flex">
            {CUSTOMER_SAMPLE_BADGE}
          </span>
        </div>

        <div className="mt-6 inline-flex w-full rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg)] p-1 shadow-[var(--vision-shadow-soft)] sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[44px] flex-1 rounded-full px-4 text-[13px] font-semibold transition sm:flex-none sm:px-5 ${
                tab === t.id ? VISION_TAB_ACTIVE : VISION_TAB_IDLE
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`mt-6 overflow-hidden ${VISION_PANEL}`}>
          <LandingPanelHeader
            title={
              tab === "blog" ? "이야기" : tab === "place" ? "플레이스" : "인스타"
            }
          />
          <div
            className="max-h-[min(68vh,560px)] overflow-y-auto scroll-smooth bg-[var(--vision-panel-bg)] p-4 sm:p-5"
            suppressHydrationWarning
          >
            {tab === "blog" && <SampleBlogPreview blog={s.blog} />}
            {tab === "place" && <SamplePlacePreview place={s.place} />}
            {tab === "insta" && <SampleInstaPreview body={s.insta.body} />}
          </div>
        </div>

        {onTest ? (
          <button
            type="button"
            onClick={onTest}
            className={`${VISION_CTA_ACCENT} briclog-vision-cta-glow mt-8 w-full min-h-[52px]`}
          >
            <span>{LANDING_PRIMARY_CTA}</span>
          </button>
        ) : null}
        {onTest ? (
          <p className="mt-3 text-center text-[13px] text-[var(--vision-muted)]">
            {LANDING_PRIMARY_SUB}
          </p>
        ) : null}
        <p className="mt-4 hidden text-center text-[13px] text-[var(--vision-muted)] sm:block">
          붙여넣기 대신 운영 계획에서 이어갑니다
        </p>
      </div>
    </section>
  );
}
