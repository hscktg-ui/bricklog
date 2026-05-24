"use client";

import { WHY_BRICLOG } from "@/lib/landing/sampleContent";

export default function WhyBriclog() {
  return (
    <section className="bg-white px-4 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-[22px] font-bold text-[#191F28] md:text-[26px]">
          왜 브릭로그인가
        </h2>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-[#8B95A1]">
          주제 하나로 이야기 · 플레이스 · 인스타 글을 차곡 쌓는 브랜드 글쓰기입니다
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2">
          {WHY_BRICLOG.map((item, i) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E8EBED] bg-[#FAFBFC] p-6"
            >
              <span className="text-[32px] font-bold text-[#03C75A]/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[17px] font-bold text-[#191F28]">
                {item.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#4E5968]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
