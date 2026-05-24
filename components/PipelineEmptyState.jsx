"use client";

import Icon from "./Icon";

export default function PipelineEmptyState({
  title = "이 채널에서 바로 생성할 수 있어요.",
  description = "다른 채널 초안이 있으면 그걸 바탕으로 이어집니다. 없어도 주제·브랜드만으로 만들 수 있습니다.",
  onGoBlog,
  goBlogLabel = "블로그 글에서 가져오기",
  onGenerate,
  generateLabel = "생성",
  generateDisabled = false,
  generating = false,
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-[#E8EBED]">
        <Icon name="document" className="h-8 w-8 text-[#03C75A]" />
      </div>
      <p className="text-[16px] font-semibold text-[#191F28]">{title}</p>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[#8B95A1]">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled || generating}
            className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
          >
            {generating ? "만드는 중…" : generateLabel}
          </button>
        )}
        {onGoBlog && (
          <button
            type="button"
            onClick={onGoBlog}
            className="rounded-xl border border-[#E8EBED] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#4E5968] hover:border-[#03C75A]/40"
          >
            {goBlogLabel}
          </button>
        )}
      </div>
    </div>
  );
}
