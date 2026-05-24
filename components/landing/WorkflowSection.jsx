"use client";

import { WORKFLOW_STEPS } from "@/lib/landing/sampleContent";

export default function WorkflowSection() {
  return (
    <section className="bg-[#F7F8FA] px-4 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-[20px] font-bold text-[#191F28] md:text-[22px]">
          이렇게 쓰시면 돼요
        </h2>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-[#8B95A1]">
          브랜드와 주제를 정한 뒤, 이야기 → 플레이스 · 인스타 순으로 이어갑니다
        </p>
        <ol className="mt-10 flex flex-col gap-3 @min-[640px]:grid @min-[640px]:grid-cols-2 @min-[960px]:grid-cols-3 @min-[640px]:gap-4">
          {WORKFLOW_STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-2xl border border-[#E8EBED] bg-white p-4 @min-[640px]:p-5"
            >
              <span className="shrink-0 text-[20px] font-bold text-[#03C75A]">
                {s.n}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[#191F28]">{s.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4E5968] break-keep">
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
