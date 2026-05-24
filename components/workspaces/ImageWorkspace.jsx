"use client";

import BlogSourcePanel from "@/components/BlogSourcePanel";
import CopyCard from "@/components/CopyCard";
import Icon from "@/components/Icon";
import {
  IMAGE_PURPOSE_OPTIONS,
  IMAGE_RATIO_OPTIONS,
  IMAGE_TONE_OPTIONS,
} from "@/lib/constants";

const PROMPT_KEY = {
  thumbnail: "thumbnailPrompt",
  place: "placeImagePrompt",
  insta: "instagramCardPrompt",
  banner: "bannerPrompt",
};

export default function ImageWorkspace({
  blog,
  blogInput,
  imagePack,
  options,
  onOptionsChange,
  isGenerating,
  onGenerate,
  onCopy,
}) {
  const key = PROMPT_KEY[options.purpose] || "thumbnailPrompt";
  const basePrompt = imagePack?.[key] || "";
  const prompt = basePrompt
    ? `${basePrompt} Aspect ratio ${options.ratio}.`
    : "";

  const handleCopy = () => {
    if (prompt) onCopy?.(prompt);
  };

  const setOpt = (k, v) => onOptionsChange({ ...options, [k]: v });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-[#F7F8FA] p-6 lg:w-[340px]">
        <h2 className="text-[18px] font-bold text-[#191F28]">이미지 생성</h2>
        <p className="mt-1 text-[13px] text-[#8B95A1]">
          블로그·브랜드 정보로 이미지 프롬프트를 만듭니다.
        </p>
        <div className="mt-5">
          <BlogSourcePanel blog={blog} blogInput={blogInput} />
        </div>

        <OptionGroup
          label="이미지 용도"
          options={IMAGE_PURPOSE_OPTIONS}
          value={options.purpose}
          onChange={(v) => setOpt("purpose", v)}
        />
        <OptionGroup
          label="이미지 비율"
          options={IMAGE_RATIO_OPTIONS}
          value={options.ratio}
          onChange={(v) => setOpt("ratio", v)}
        />
        <OptionGroup
          label="이미지 톤"
          options={IMAGE_TONE_OPTIONS}
          value={options.tone}
          onChange={(v) => setOpt("tone", v)}
        />

        <button
          type="button"
          disabled={!blog || isGenerating}
          onClick={onGenerate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
        >
          {isGenerating ? "생성 중…" : "이미지 프롬프트 생성"}
        </button>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-6 md:p-8">
        {imagePack ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!prompt}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] font-medium text-[#4E5968] hover:bg-[#F7F8FA] disabled:opacity-50"
              >
                <Icon name="copy" className="h-4 w-4" />
                복사하기
              </button>
            </div>
            <CopyCard label="이미지 프롬프트" value={prompt} />
            <div className="rounded-xl border border-[#E8EBED] bg-[#F7F8FA] p-8 text-center">
              <div className="mx-auto flex aspect-video max-w-md items-center justify-center rounded-lg border-2 border-dashed border-[#D1D6DB] bg-white">
                <div className="text-[#8B95A1]">
                  <Icon name="image" className="mx-auto h-10 w-10 opacity-40" />
                  <p className="mt-2 text-[13px]">이미지 미리보기</p>
                  <p className="text-[11px]">({options.ratio})</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#B0B8C1]">
                OpenAI Images / Midjourney 등에 프롬프트를 붙여넣으세요
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center text-[14px] text-[#8B95A1]">
            프롬프트가 여기에 표시됩니다
          </div>
        )}
      </div>
    </div>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="mt-4">
      <p className="text-[13px] font-medium text-[#4E5968]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-[12px] font-medium ${
              value === o.value
                ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                : "border-[#E8EBED] bg-white text-[#4E5968]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
