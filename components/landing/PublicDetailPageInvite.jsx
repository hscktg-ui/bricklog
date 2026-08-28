"use client";

import Link from "next/link";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_SECTION,
} from "@/lib/landing/vision2030Styles";

const PILLAR_STAGGER = [
  "briclog-vision-stagger-1",
  "briclog-vision-stagger-2",
  "briclog-vision-stagger-3",
  "briclog-vision-stagger-4",
];

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
          <span className="block text-[var(--vision-ink)]">{p.versusGpt}</span>
          <span className="mt-1 block font-medium text-[var(--vision-ink)]">{p.versusUs}</span>
          <span className="mt-3 block">{p.sub}</span>
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2 @min-[560px]:gap-5">
          {p.pillars.map((item, i) => (
            <article
              key={item.title}
              className={`group rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-7 shadow-[var(--vision-shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--vision-shadow-panel)] briclog-vision-stagger ${PILLAR_STAGGER[i]} ${
                i === 0 ? "@min-[560px]:p-9" : ""
              }`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))] text-[12px] font-bold tabular-nums text-[var(--vision-accent-deep,#03a94d)] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className={`mt-5 font-semibold tracking-tight text-[var(--vision-ink)] ${
                  i === 0 ? "text-[20px] md:text-[22px]" : "text-[19px]"
                }`}
              >
                {item.title}
              </h3>
              <p
                className={`mt-3 leading-relaxed text-[var(--vision-muted)] ${
                  i === 0 ? "text-[16px]" : "text-[15px]"
                }`}
              >
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
