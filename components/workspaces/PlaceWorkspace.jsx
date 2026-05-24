"use client";

import BlogSourcePanel from "@/components/BlogSourcePanel";
import { PlaceResultView } from "@/components/ChannelResultViews";
import Icon from "@/components/Icon";
import { formatTabForCopy } from "@/lib/contentFormat";

export default function PlaceWorkspace({
  blog,
  blogInput,
  place,
  isGenerating,
  onGenerate,
  onCopy,
}) {
  const handleCopy = () => {
    const text = formatTabForCopy("smartplace", { smartplace: place });
    onCopy?.(text);
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-[#F7F8FA] p-6 lg:w-[340px]">
        <h2 className="text-[18px] font-bold text-[#191F28]">플레이스 소식</h2>
        <p className="mt-1 text-[13px] text-[#8B95A1]">
          블로그 본문을 기준으로 스마트플레이스 소식을 만듭니다.
        </p>
        <div className="mt-5">
          <BlogSourcePanel blog={blog} blogInput={blogInput} />
        </div>
        <button
          type="button"
          disabled={!blog || isGenerating}
          onClick={onGenerate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
        >
          {isGenerating ? "변환 중…" : "블로그 기반 플레이스 생성"}
        </button>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-6 md:p-8">
        {place ? (
          <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] font-medium text-[#4E5968] hover:bg-[#F7F8FA]"
              >
                <Icon name="copy" className="h-4 w-4" />
                복사하기
              </button>
            </div>
            <PlaceResultView place={place} />
          </>
        ) : (
          <EmptyResult label="플레이스 소식 결과" />
        )}
      </div>
    </div>
  );
}

function EmptyResult({ label }) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center text-[14px] text-[#8B95A1]">
      {label}이 여기에 표시됩니다
    </div>
  );
}
