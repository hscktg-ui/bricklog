"use client";

import {
  CORE_ENGINE_EYEBROW,
  CORE_ENGINE_ENTERPRISE_NOTE,
  CORE_ENGINE_HEADLINE,
  CORE_ENGINE_PILLARS,
  CORE_ENGINE_SUB,
} from "@/lib/landing/coreEngineCopy";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

export default function CoreEngineSection() {
  return (
    <section className={`${VISION_SECTION} border-t border-[var(--vision-line)] px-5 py-16 md:px-8 md:py-20`}>
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>{CORE_ENGINE_EYEBROW}</p>
        <h2 className="mt-3 text-center text-[clamp(1.35rem,3vw,1.85rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          {CORE_ENGINE_HEADLINE}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-[var(--vision-muted)]">
          {CORE_ENGINE_SUB}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2">
          {CORE_ENGINE_PILLARS.map((item, i) => (
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

        <p className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-relaxed text-[var(--vision-muted)]">
          {CORE_ENGINE_ENTERPRISE_NOTE}
        </p>
      </div>
    </section>
  );
}
