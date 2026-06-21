"use client";

import { WHY_BRICLOG } from "@/lib/landing/sampleContent";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

const WHY_STAGGER = [
  "briclog-vision-stagger-1",
  "briclog-vision-stagger-2",
  "briclog-vision-stagger-3",
  "briclog-vision-stagger-4",
  "briclog-vision-stagger-5",
];

export default function WhyBriclog() {
  return (
    <section className={`${VISION_SECTION} px-5 py-16 md:px-8 md:py-24`}>
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>Why BRICLOG</p>
        <h2 className="mt-3 text-center text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          글 하나가 아니라,
          <span className="block text-[var(--vision-muted)]">운영이 쌓입니다</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[17px] leading-relaxed text-[var(--vision-muted)]">
          조사 → 초안 → 채널별 정리. 복잡한 과정은 숨기고, 결과만 남깁니다.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 @min-[720px]:grid-cols-6 @min-[720px]:grid-rows-2 @min-[720px]:gap-5">
          {WHY_BRICLOG.map((item, i) => (
            <article
              key={item.title}
              className={`group rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-7 shadow-[var(--vision-shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--vision-shadow-panel)] briclog-vision-stagger ${WHY_STAGGER[Math.min(i, WHY_STAGGER.length - 1)]} ${
                i === 0
                  ? "@min-[720px]:col-span-3 @min-[720px]:row-span-2 @min-[720px]:p-9"
                  : i === 1
                    ? "@min-[720px]:col-span-3"
                    : "@min-[720px]:col-span-2"
              }`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))] text-[12px] font-bold tabular-nums text-[var(--vision-accent-deep,#03a94d)] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className={`mt-5 font-semibold tracking-tight text-[var(--vision-ink)] ${
                  i === 0 ? "text-[22px] md:text-[26px]" : "text-[19px]"
                }`}
              >
                {item.title}
              </h3>
              <p
                className={`mt-3 leading-relaxed text-[var(--vision-muted)] ${
                  i === 0 ? "text-[16px] md:text-[17px]" : "text-[15px]"
                }`}
              >
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
