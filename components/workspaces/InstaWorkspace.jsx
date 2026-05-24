"use client";

import BlogSourcePanel from "@/components/BlogSourcePanel";
import { InstaResultView } from "@/components/ChannelResultViews";
import Icon from "@/components/Icon";
import { INSTA_TONE_OPTIONS } from "@/lib/constants";
import { formatTabForCopy } from "@/lib/contentFormat";

export default function InstaWorkspace({
  blog,
  blogInput,
  insta,
  instaTone,
  onInstaToneChange,
  isGenerating,
  onGenerate,
  onCopy,
}) {
  const handleCopy = () => {
    const text = formatTabForCopy("insta", { insta });
    onCopy?.(text);
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-[#F7F8FA] p-6 lg:w-[340px]">
        <h2 className="text-[18px] font-bold text-[#191F28]">인스타그램 바디</h2>
        <p className="mt-1 text-[13px] text-[#8B95A1]">
          블로그 본문을 인스타 캡션 형식으로 변환합니다.
        </p>
        <div className="mt-5">
          <BlogSourcePanel blog={blog} blogInput={blogInput} />
        </div>

        <p className="mt-5 text-[13px] font-medium text-[#4E5968]">인스타 톤</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {INSTA_TONE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onInstaToneChange(o.value)}
              className={`rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
                instaTone === o.value
                  ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                  : "border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#C5CAD0]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!blog || isGenerating}
          onClick={onGenerate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
        >
          {isGenerating ? "변환 중…" : "블로그 기반 인스타 생성"}
        </button>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-6 md:p-8">
        {insta ? (
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
            <InstaResultView insta={insta} />
          </>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center text-[14px] text-[#8B95A1]">
            인스타 바디 결과가 여기에 표시됩니다
          </div>
        )}
      </div>
    </div>
  );
}
