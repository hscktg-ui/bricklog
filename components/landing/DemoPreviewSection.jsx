"use client";

import { useState } from "react";
import { CUSTOMER_SAMPLE_BADGE } from "@/lib/copy/customerFacing";
import { LANDING_SAMPLE } from "@/lib/landing/sampleContent";
import {
  SampleBlogPreview,
  SampleInstaPreview,
  SamplePlacePreview,
} from "@/components/landing/SamplePreviewBlocks";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SECTION,
} from "@/lib/landing/vision2030Styles";

const TABS = [
  { id: "blog", label: "이야기" },
  { id: "place", label: "플레이스" },
  { id: "insta", label: "인스타" },
];

export default function DemoPreviewSection({ sample }) {
  const s = sample ?? LANDING_SAMPLE;
  const [tab, setTab] = useState("blog");

  return (
    <section
      id="landing-sample"
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-3xl">
        <p className={VISION_EYEBROW}>Preview</p>
        <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          한 주제, 채널별 초안
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--vision-muted)]">
          실제 화면과 비슷한 예시입니다. 가입 후 같은 흐름으로 씁니다.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="flex-1 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 py-3 text-[14px] text-[var(--vision-muted)]">
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
          <span className="shrink-0 rounded-full bg-[var(--vision-accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#041208] lg:bg-[var(--vision-ink)] lg:text-white">
            {CUSTOMER_SAMPLE_BADGE}
          </span>
        </div>

        <div className="mt-6 inline-flex rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-1 shadow-[var(--vision-shadow-soft)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] rounded-full px-5 text-[13px] font-semibold transition ${
                tab === t.id
                  ? "bg-[var(--vision-accent)] text-[#041208] shadow-sm lg:bg-[var(--vision-ink)] lg:text-white"
                  : "text-[var(--vision-muted)] hover:text-[var(--vision-ink)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`${VISION_PANEL} mt-6 p-5 sm:p-7`}>
          <span className="rounded-full bg-[var(--vision-paper)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]">
            {tab === "blog" ? "Story" : tab === "place" ? "Place" : "Instagram"}
          </span>

          <div
            className="mt-5 max-h-[min(72vh,640px)] overflow-y-auto scroll-smooth pr-1"
            suppressHydrationWarning
          >
            {tab === "blog" && <SampleBlogPreview blog={s.blog} />}
            {tab === "place" && <SamplePlacePreview place={s.place} />}
            {tab === "insta" && <SampleInstaPreview body={s.insta.body} />}
          </div>
        </div>

        <p className="mt-4 text-center text-[13px] text-[var(--vision-muted)]">
          프롬프트·붙여넣기 검수는 가입 후 메뉴에서 이용할 수 있어요
        </p>
      </div>
    </section>
  );
}
