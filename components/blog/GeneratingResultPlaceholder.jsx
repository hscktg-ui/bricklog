"use client";

import SkeletonPreview from "@/components/SkeletonPreview";

export default function GeneratingResultPlaceholder({
  compact = false,
  phase = "writing",
  previewTitle = null,
  channelLabel = "이야기",
}) {
  const revealing = phase === "revealing";
  const title = revealing
    ? `${channelLabel} 표시 중…`
    : `${channelLabel} 작성 중…`;
  const body = revealing
    ? "완성본을 불러오는 중입니다. 화면이 비어 보여도 정상이에요."
    : "브랜드·주제에 맞는 정보를 확인한 뒤, 요청하신 톤으로 글을 쓰고 있어요.";

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
          <p className="text-[15px] font-semibold text-[#191F28]">{title}</p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">{body}</p>
        {revealing && previewTitle ? (
          <p className="mt-3 rounded-lg bg-[#F7F8FA] px-3 py-2 text-[13px] font-medium text-[#4E5968]">
            {previewTitle}
          </p>
        ) : null}
        <div className="mt-6">
          <SkeletonPreview />
        </div>
      </div>
      {!compact ? (
        <p className="mt-4 text-center text-[12px] text-[#B0B8C1]">
          {revealing
            ? "완성본을 불러오는 중입니다. 닫지 마세요."
            : "완성되면 이 영역에 표시됩니다"}
        </p>
      ) : null}
    </div>
  );
}
