"use client";

import BlogForm from "@/components/BlogForm";
import BlogResultView from "@/components/BlogResultView";
import Icon from "@/components/Icon";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";

export default function BlogWorkspace({
  values,
  errors,
  onChange,
  advancedOpen,
  onAdvancedToggle,
  blog,
  isGenerating,
  onGenerate,
  disabled,
  disabledReason,
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-white lg:w-[380px]">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-[#191F28]">블로그 본문</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#8B95A1]">
            이야기를 만든 뒤 플레이스·인스타는 자동 연동됩니다. 프롬프트는
            「프롬프트」 메뉴에서 따로 만듭니다.
          </p>
          <div className="mt-6">
            <BlogForm
              values={values}
              errors={errors}
              onChange={onChange}
              advancedOpen={advancedOpen}
              onAdvancedToggle={onAdvancedToggle}
            />
          </div>
          <button
            type="button"
            disabled={disabled || isGenerating}
            onClick={onGenerate}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#02B350] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                생성 중…
              </>
            ) : (
              <>
                <Icon name="sparkles" className="h-5 w-5" />
                블로그 본문 생성
              </>
            )}
          </button>
          {disabledReason && !isGenerating && (
            <p className="mt-2 text-center text-[12px] text-[#E67700]">
              {disabledReason}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-6 md:p-8">
        {!blog ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#E8EBED]">
              <Icon name="document" className="h-7 w-7 text-[#03C75A]" />
            </div>
            <p className="text-[15px] font-medium text-[#4E5968]">
              블로그 본문이 여기에 표시됩니다
            </p>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#8B95A1]">
              최소 {BLOG_MIN_BODY_CHARS.toLocaleString()}자(공백 제외) · 제목 5개 ·
              섹션 · 마무리 · 해시태그
            </p>
          </div>
        ) : (
          <BlogResultView blog={blog} />
        )}
      </div>
    </div>
  );
}
