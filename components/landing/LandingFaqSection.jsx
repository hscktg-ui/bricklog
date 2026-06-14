"use client";

import { LANDING_FAQ_ITEMS } from "@/lib/landing/landingFaq";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

export default function LandingFaqSection() {
  return (
    <section
      id="landing-faq"
      className={`${VISION_SECTION} scroll-mt-24 px-5 py-16 md:px-8 md:py-24`}
      aria-labelledby="landing-faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <p className={VISION_EYEBROW}>자주 묻는 질문</p>
        <h2
          id="landing-faq-heading"
          className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-tight text-[var(--vision-ink)]"
        >
          시작 전에 궁금한 점
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--vision-muted)]">
          매장·브랜드 운영자가 많이 묻는 내용만 정리했습니다.
        </p>

        <div className="mt-8 space-y-3">
          {LANDING_FAQ_ITEMS.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-5 py-4 shadow-[var(--vision-shadow-soft)] open:shadow-[var(--vision-shadow-panel)]"
            >
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-[var(--vision-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  {item.q}
                  <span
                    className="mt-0.5 shrink-0 text-[var(--vision-muted)] transition group-open:rotate-180"
                    aria-hidden
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--vision-muted)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
