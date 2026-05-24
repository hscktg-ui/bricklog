"use client";

import SkeletonPreview from "@/components/SkeletonPreview";

export default function GeneratingResultPlaceholder({ compact = false }) {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col px-2 py-8 md:py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-[#E8EBED] bg-white px-5 py-6 shadow-sm md:px-7 md:py-8">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#03C75A]"
            aria-hidden
          />
          <p className="text-[15px] font-semibold text-[#191F28]">
            이야기를 쓰는 중…
          </p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">
          완성되면 이 영역에 표시됩니다
        </p>
        <div className="mt-6">
          <SkeletonPreview />
        </div>
      </div>
      {!compact ? (
        <p className="mt-4 text-center text-[12px] text-[#B0B8C1]">
          오른쪽 영역에 순서대로 채워집니다
        </p>
      ) : null}
    </div>
  );
}
