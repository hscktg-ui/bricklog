"use client";

import { useState } from "react";
import { CUSTOMER_SAMPLE_BADGE } from "@/lib/copy/customerFacing";
import { LANDING_SAMPLE } from "@/lib/landing/sampleContent";
import {
  SampleBlogPreview,
  SampleInstaPreview,
  SamplePlacePreview,
} from "@/components/landing/SamplePreviewBlocks";

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
      className="scroll-mt-20 bg-white px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-[20px] font-bold text-[#191F28] md:text-[24px]">
          한 주제, 채널별 초안
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8B95A1]">
          실제 화면과 비슷한 예시입니다. 가입 후 같은 흐름으로 씁니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="flex-1 rounded-xl bg-[#F7F8FA] px-3 py-2.5 text-[13px] text-[#4E5968]">
            <span className="font-semibold text-[#191F28]">{s.brand.name}</span>
            {s.brand.region ? (
              <>
                <span className="text-[#8B95A1]"> · </span>
                {s.brand.region}
              </>
            ) : null}
            <span className="text-[#8B95A1]"> · </span>
            {s.topic}
          </p>
          <span className="shrink-0 rounded-full bg-[#E8F9EF] px-3 py-1.5 text-[12px] font-bold text-[#03A94D]">
            {CUSTOMER_SAMPLE_BADGE}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-[#8B95A1]">
          접속할 때마다 다른 업종 예시가 보입니다 · 스크롤해 본문 전체를 확인할 수 있어요
        </p>

        <div className="mt-4 flex gap-1 rounded-xl bg-[#F7F8FA] p-1 ring-1 ring-[#E8EBED]/60">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] flex-1 rounded-lg text-[13px] font-semibold transition ${
                tab === t.id
                  ? "bg-white text-[#03A94D] shadow-sm"
                  : "text-[#6B7684]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8EBED] bg-white shadow-[0_8px_32px_rgba(25,31,40,0.05)] sm:p-6 p-5">
          <span className="rounded-md bg-[#E8F9EF] px-2 py-0.5 text-[11px] font-semibold text-[#03A94D]">
            {tab === "blog" ? "이야기" : tab === "place" ? "플레이스" : "인스타"}
          </span>

          <div
            className="mt-4 max-h-[min(72vh,640px)] overflow-y-auto pr-1 scroll-smooth"
            suppressHydrationWarning
          >
            {tab === "blog" && <SampleBlogPreview blog={s.blog} />}
            {tab === "place" && <SamplePlacePreview place={s.place} />}
            {tab === "insta" && <SampleInstaPreview body={s.insta.body} />}
          </div>
        </div>

        <p className="mt-3 text-center text-[12px] text-[#8B95A1]">
          프롬프트·붙여넣기 검수는 가입 후 메뉴에서 이용할 수 있어요
        </p>
      </div>
    </section>
  );
}
