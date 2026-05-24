"use client";

import { useCallback, useState } from "react";
import { useDeferredWorkspaceForm } from "@/lib/hooks/useDeferredWorkspaceForm";
import ChannelGenPrefToggle, {
  useChannelPreferStandalone,
} from "@/components/channels/ChannelGenPrefToggle";
import BlogSourcePanel from "@/components/BlogSourcePanel";
import ChannelStartScreen from "@/components/channels/ChannelStartScreen";
import ImageBriefFields from "@/components/channels/ImageBriefFields";
import CopyCard from "@/components/CopyCard";
import FullCopyButton from "@/components/FullCopyButton";
import Icon from "@/components/Icon";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import {
  useContentForm,
  useContentPipelineState,
} from "@/context/ContentContext";
import {
  IMAGE_PURPOSE_OPTIONS,
  IMAGE_TONE_OPTIONS,
  IMAGE_PROVIDER_OPTIONS,
} from "@/lib/constants";
import {
  IMAGE_PURPOSE_RATIO_LABEL,
  resolveImageRatioForPurpose,
} from "@/lib/images/imagePurposeConfig";

const PROMPT_KEY = {
  thumbnail: "thumbnailPrompt",
  place: "placeImagePrompt",
  insta: "instagramCardPrompt",
  banner: "bannerPrompt",
};

export default function ImagePromptGenerator({ onGoBlog, onCopy }) {
  const { blogInput, setBlogInput } = useContentForm();
  const {
    blogContent,
    placeContent,
    instagramContent,
    baseContentLabel,
    imagePrompts,
    imageOptions,
    setImageOptions,
    generating,
    hasFullBlog,
    hasOtherDraft,
    generateImage,
    sourceChannel,
  } = useContentPipelineState();
  const { activeBrand } = useBrandWorkspace();
  const { draft, setDraft, formApiRef, flushToCommitted } =
    useDeferredWorkspaceForm(blogInput, setBlogInput);
  const [localImageOptions, setLocalImageOptions] = useState(imageOptions);

  const runImageGenerate = useCallback(
    (opts = {}) => {
      const input = flushToCommitted();
      if (!input) return;
      generateImage({
        ...opts,
        inputOverride: input,
        imageOptionsOverride: localImageOptions,
      });
    },
    [flushToCommitted, generateImage, localImageOptions]
  );

  if (!imagePrompts) {
    return (
      <ChannelStartScreen
        channel="image"
        blogInput={blogInput}
        setBlogInput={setBlogInput}
        activeBrand={activeBrand}
        imageOptions={imageOptions}
        setImageOptions={setImageOptions}
        blogContent={blogContent}
        placeContent={placeContent}
        instagramContent={instagramContent}
        sourceChannel={sourceChannel}
        baseContentLabel={baseContentLabel}
        generating={generating.image}
        hasFullBlog={hasFullBlog}
        hasOtherDraft={hasOtherDraft}
        onGenerate={runImageGenerate}
        onGenerateFromDraft={() =>
          runImageGenerate({ preferStandalone: false })
        }
        onGoBlog={onGoBlog}
      />
    );
  }

  const purpose = localImageOptions.purpose || imageOptions.purpose || "thumbnail";
  const key = PROMPT_KEY[purpose] || "thumbnailPrompt";
  const ratio = resolveImageRatioForPurpose(
    purpose,
    localImageOptions.ratio || imageOptions.ratio
  );
  const prompt =
    imagePrompts?.activePrompt ||
    (imagePrompts?.[key] ? `${imagePrompts[key]}` : "");

  const setOpt = (k, v) =>
    setLocalImageOptions((prev) => ({ ...prev, [k]: v }));

  const canGenerate =
    Boolean(draft?.topic?.trim() || draft?.brandName?.trim()) ||
    hasFullBlog ||
    hasOtherDraft;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-[#F7F8FA] p-6 lg:w-[340px]">
        <h2 className="text-[18px] font-bold text-[#191F28]">비주얼 프롬프트</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#8B95A1]">
          썸네일·카드용 영문 프롬프트입니다. 초안이 있으면 헤드카피·용도·비율이
          맞춰집니다.
        </p>
        {blogContent && (
          <div className="mt-5">
            <BlogSourcePanel
              blog={blogContent}
              baseLabel={baseContentLabel}
              compact
            />
          </div>
        )}

        <ChannelGenPrefToggle
          channel="image"
          preferStandalone={preferStandalone}
          onPreferStandaloneChange={setPreferStandalone}
          className="mt-5"
        />
        <ImageBriefFields
          blogInput={draft}
          onDraftChange={setDraft}
          formApiRef={formApiRef}
          imageOptions={localImageOptions}
          setImageOptions={setLocalImageOptions}
          blogContent={blogContent}
          placeContent={placeContent}
          instagramContent={instagramContent}
          sourceChannel={sourceChannel}
          baseContentLabel={baseContentLabel}
          deferUntilCommit
        />

        <OptionGroup
          label="생성 엔진"
          options={IMAGE_PROVIDER_OPTIONS}
          value={localImageOptions.provider || "auto"}
          onChange={(v) => setOpt("provider", v)}
        />
        <OptionGroup
          label="톤"
          options={IMAGE_TONE_OPTIONS}
          value={localImageOptions.tone}
          onChange={(v) => setOpt("tone", v)}
        />

        <p className="mt-4 text-[11px] text-[#8B95A1]">
          적용 비율:{" "}
          <span className="font-medium text-[#4E5968]">
            {ratio} ({IMAGE_PURPOSE_RATIO_LABEL[purpose]})
          </span>
        </p>

        <button
          type="button"
          disabled={!canGenerate || generating.image}
          onClick={() => runImageGenerate({ preferStandalone })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
        >
          {generating.image ? "만드는 중…" : "프롬프트 다시 만들기"}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">
          실제 이미지 파일 생성은 서비스 설정에 따라 달라질 수 있습니다.
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-6 md:p-8">
        {imagePrompts?._meta?.baseLabel && (
          <p className="mb-4 text-[12px] text-[#8B95A1]">
            <span className="font-medium text-[#03A94D]">기준</span>{" "}
            {imagePrompts._meta.baseLabel}
          </p>
        )}

        {imagePrompts ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex flex-wrap justify-end gap-2">
              {imagePrompts.imageProvider && (
                <span className="rounded-lg bg-[#E8F9EF] px-2 py-1 text-[11px] font-semibold text-[#03A94D]">
                  {imagePrompts.imageProvider === "openai"
                    ? "OpenAI"
                    : "Nano Banana"}
                </span>
              )}
              <span className="rounded-lg border border-[#E8EBED] px-2 py-1 text-[11px] text-[#4E5968]">
                {IMAGE_PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label} ·{" "}
                {ratio}
              </span>
              <button
                type="button"
                disabled={!prompt}
                onClick={() => onCopy?.(prompt)}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] font-medium hover:bg-[#F7F8FA] disabled:opacity-50"
              >
                <Icon name="copy" className="h-4 w-4" />
                프롬프트 복사하기
              </button>
              <FullCopyButton
                text={imagePrompts.fullCopyText}
                onCopy={() => onCopy?.(imagePrompts.fullCopyText)}
              />
            </div>

            {imagePrompts.imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-[#E8EBED] bg-[#FAFBFC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePrompts.imageUrl}
                  alt="생성된 마케팅 이미지"
                  className="mx-auto max-h-[480px] w-full object-contain"
                />
                <p className="border-t border-[#E8EBED] py-2 text-center text-[11px] text-[#8B95A1]">
                  {ratio} · 실제 AI 생성 이미지
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#F7F8FA] p-8 text-center">
                <Icon name="image" className="mx-auto h-10 w-10 text-[#B0B8C1]" />
                <p className="mt-2 text-[13px] text-[#4E5968]">
                  연동된 이미지 API가 있으면 미리보기가 표시됩니다
                </p>
                {imagePrompts.imageError && (
                  <p className="mt-1 text-[12px] text-[#E67700]">
                    {imagePrompts.imageError}
                  </p>
                )}
              </div>
            )}

            <CopyCard label="이미지 프롬프트 (영문)" value={prompt} />
          </div>
        ) : (
          <p className="text-center text-[14px] text-[#8B95A1]">
            왼쪽에서 생성 버튼을 눌러 주세요
          </p>
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
