"use client";

import Link from "next/link";
import {
  LANDING_FAQ_CATEGORIES,
  LANDING_FAQ_ITEMS,
} from "@/lib/landing/landingFaq";
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
          매장·브랜드 운영자가 많이 묻는 내용입니다. 더 궁금하면{" "}
          <Link href="/help" className="font-semibold text-[var(--vision-accent)] hover:underline">
            전체 FAQ
          </Link>
          또는 오른쪽 아래 ? AI 도움말을 이용해 주세요.
        </p>

        {LANDING_FAQ_CATEGORIES.map((cat) => {
          const items = LANDING_FAQ_ITEMS.filter((i) => i.category === cat.id);
          if (!items.length) return null;
          return (
            <div key={cat.id} className="mt-10">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--vision-accent)]">
                {cat.label}
              </h3>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
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
          );
        })}
      </div>
    </section>
  );
}
