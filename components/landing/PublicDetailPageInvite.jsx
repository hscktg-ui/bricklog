"use client";

import Link from "next/link";
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
      id="public-detail-page"
      className={`${VISION_SECTION} scroll-mt-20 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>{p.eyebrow}</p>
        <h2 className="mt-3 text-center text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          {p.headline}
          <span className="block text-[var(--vision-muted)]">{p.headlineBreak}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[17px] leading-relaxed text-[var(--vision-muted)]">
          {p.sub}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2">
          {p.pillars.map((item, i) => (
            <article
              key={item.title}
              className="rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-6 shadow-[var(--vision-shadow-soft)]"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[17px] font-semibold text-[var(--vision-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--vision-muted)]">
                {item.desc}
              </p>
            </article>
          ))}
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
