"use client";

import Link from "next/link";
import DetailPageSampleZone from "@/components/DetailPageSampleZone";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_SECTION,
} from "@/lib/landing/vision2030Styles";

export default function PublicDetailPageInvite() {
  const p = DETAIL_PAGE_PRODUCT;
  return (
    <section
      id={p.sampleZoneId}
      className={`${VISION_SECTION} scroll-mt-20 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>{p.eyebrow}</p>
        <h2 className="mt-3 text-center text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          {p.headline}
          <span className="block text-[var(--vision-muted)]">{p.headlineBreak}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[17px] leading-relaxed text-[var(--vision-muted)]">
          {p.versusGpt} {p.versusUs} 로그인 없이 스크롤합니다.
        </p>

        <div className="mt-10">
          <DetailPageSampleZone height={640} />
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/detail" className={`${VISION_CTA_ACCENT} !w-auto`}>
            {p.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
