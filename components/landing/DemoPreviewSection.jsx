"use client";

import { useState } from "react";
import { CUSTOMER_SAMPLE_BADGE } from "@/lib/copy/customerFacing";
import { LANDING_SAMPLE } from "@/lib/landing/sampleContent";
import {
  SampleBlogPreview,
  SampleInstaPreview,
  SamplePlacePreview,
} from "@/components/landing/SamplePreviewBlocks";
import DevicePreviewToggle, {
  DevicePreviewFrame,
  useDevicePreview,
} from "@/components/landing/DevicePreviewToggle";
import { LANDING_PRIMARY_CTA } from "@/lib/landing/ctaCopy";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_SECTION,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const TABS = [
  { id: "blog", label: "이야기" },
  { id: "place", label: "플레이스" },
  { id: "insta", label: "인스타" },
];

export default function DemoPreviewSection({ sample, onTest }) {
  const s = sample ?? LANDING_SAMPLE;
  const [tab, setTab] = useState("blog");
  const { device, setDevice } = useDevicePreview("mobile");

  return (
    <section
      id="landing-sample"
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-3xl">
        <p className={`${VISION_EYEBROW} text-center`}>Sample</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          한 주제, 세 채널
        </h2>
        <p className={`mt-4 text-center ${VISION_SUB}`}>
          실제 작업실과 같은 흐름입니다. 미리보기만으로도 감이 옵니다.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex-1 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 py-3.5 text-[14px] text-[var(--vision-muted)] shadow-[var(--vision-shadow-soft)]">
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
          <span className="shrink-0 self-start rounded-full bg-[var(--vision-accent)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white lg:bg-[var(--vision-accent-deep,#03a94d)]">
            {CUSTOMER_SAMPLE_BADGE}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-1 shadow-[var(--vision-shadow-soft)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-[40px] rounded-full px-5 text-[13px] font-semibold transition ${
                  tab === t.id
                    ? "bg-[var(--vision-ink)] text-white shadow-sm"
                    : "text-[var(--vision-muted)] hover:text-[var(--vision-ink)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <DevicePreviewToggle
            device={device}
            onChange={setDevice}
            showLabels
            compact
            className="w-full sm:w-auto"
          />
        </div>

        <DevicePreviewFrame device={device} className="mt-6">
          <span className="rounded-full bg-[var(--vision-paper)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]">
            {tab === "blog" ? "이야기" : tab === "place" ? "플레이스" : "인스타"}
          </span>
          <div
            className="mt-4 max-h-[min(68vh,560px)] overflow-y-auto scroll-smooth pr-1"
            suppressHydrationWarning
          >
            {tab === "blog" && <SampleBlogPreview blog={s.blog} />}
            {tab === "place" && <SamplePlacePreview place={s.place} />}
            {tab === "insta" && <SampleInstaPreview body={s.insta.body} />}
          </div>
        </DevicePreviewFrame>

        {onTest ? (
          <button
            type="button"
            onClick={onTest}
            className={`${VISION_CTA_ACCENT} briclog-vision-cta-glow mt-8 w-full min-h-[52px]`}
          >
            <span>{LANDING_PRIMARY_CTA}</span>
          </button>
        ) : null}
        <p className="mt-4 text-center text-[13px] text-[var(--vision-muted)]">
          붙여넣기·검수는 가입 후 작업실에서 이어집니다
        </p>
      </div>
    </section>
  );
}
