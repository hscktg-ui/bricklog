"use client";

import { WHY_BRICLOG } from "@/lib/landing/sampleContent";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

export default function WhyBriclog() {
  return (
    <section className={`${VISION_SECTION} px-5 py-16 md:px-8 md:py-24`}>
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>왜 브릭로그</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          왜 브릭로그인가
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[16px] leading-relaxed text-[var(--vision-muted)]">
          주제 하나로 이야기 · 플레이스 · 인스타 글을 차곡 쌓는 브랜드 글쓰기입니다
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 @min-[560px]:grid-cols-2">
          {WHY_BRICLOG.map((item, i) => (
            <article
              key={item.title}
              className="group rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-7 shadow-[var(--vision-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--vision-shadow-panel)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--vision-ink)] text-[12px] font-bold text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-[var(--vision-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--vision-muted)]">
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
