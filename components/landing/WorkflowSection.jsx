"use client";

import { WORKFLOW_STEPS } from "@/lib/landing/sampleContent";
import { VISION_EYEBROW } from "@/lib/landing/vision2030Styles";

export default function WorkflowSection() {
  return (
    <section className="px-5 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-4xl">
        <p className={`${VISION_EYEBROW} text-center`}>Workflow</p>
        <h2 className="mt-3 text-center text-[clamp(1.25rem,3vw,1.5rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          이렇게 쓰시면 돼요
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-[var(--vision-muted)]">
          브랜드와 주제를 정한 뒤, 이야기 → 플레이스 · 인스타 순으로 이어갑니다
        </p>
        <ol className="mt-10 flex flex-col gap-4 @min-[640px]:grid @min-[640px]:grid-cols-2 @min-[960px]:grid-cols-3">
          {WORKFLOW_STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-5 shadow-[var(--vision-shadow-soft)]"
            >
              <span className="shrink-0 text-[22px] font-semibold tabular-nums text-[var(--vision-ink)]">
                {String(s.n).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--vision-ink)]">{s.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--vision-muted)] break-keep">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
