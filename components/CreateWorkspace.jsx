"use client";

import { useMemo } from "react";
import { BRAND_TAGLINE, EMPTY_STATE } from "@/lib/constants";
import { WORKSPACE_BLOG } from "@/lib/product/craft";
import BlogResultView from "./BlogResultView";
import ChannelTabs from "./ChannelTabs";
import {
  HashtagResultView,
  ImageGenerativeView,
  InstaResultView,
  PlaceResultView,
} from "./ChannelResultViews";
import ContentForm from "./ContentForm";
import GenerateButton from "./GenerateButton";
import MatrixBanner from "./MatrixBanner";
import QualityPanel from "./QualityPanel";
import ResultToolbar from "./ResultToolbar";
import SkeletonPreview from "./SkeletonPreview";
import {
  VISION_WORKSPACE_CANVAS,
  VISION_WORKSPACE_PANEL,
} from "@/lib/landing/vision2030Styles";

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex justify-center">
        <p className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--vision-ink)]">
          브릭로그
        </p>
      </div>
      <p className="text-[17px] font-bold tracking-[-0.01em] text-[var(--vision-ink)]">{EMPTY_STATE.title}</p>
      <p className="mt-1 text-[12px] font-medium text-[var(--vision-accent)]">{BRAND_TAGLINE}</p>
      <p className="mt-2 max-w-sm whitespace-pre-line text-[14px] leading-relaxed text-[var(--vision-muted)]">
        {EMPTY_STATE.description}
      </p>
      <ul className="mt-4 space-y-1 text-left text-[12px] text-[var(--vision-muted)]">
        <li>· {WORKSPACE_BLOG.tagline}</li>
        <li>· 짧은·중간·긴 분량 — 고객과의 약속</li>
        <li>· 이야기 · 플레이스 · 인스타 한번에</li>
      </ul>
    </div>
  );
}

function TabContent({ activeTab, results }) {
  switch (activeTab) {
    case "blog":
      return <BlogResultView blog={results.blog} />;
    case "smartplace":
      return <PlaceResultView place={results.smartplace} />;
    case "insta":
      return <InstaResultView insta={results.insta} />;
    case "hashtag":
      return <HashtagResultView tags={results.hashtag} />;
    case "image":
      return <ImageGenerativeView imagePrompt={results.imagePrompt} />;
    default:
      return null;
  }
}

export default function CreateWorkspace({
  formValues,
  formErrors,
  onFormChange,
  onApplyPreset,
  generateProps,
  activeTab,
  onTabChange,
  results,
  hasGenerated,
  isGenerating,
  onCopyTab,
  onCopyAll,
  onDownload,
  engineMeta,
}) {
  const blogChars =
    engineMeta?.blogCharCount ?? results.blog?._meta?.charCount ?? null;

  const channelReady = useMemo(() => {
    if (!hasGenerated) return {};
    return {
      blog: Boolean(results.blog?.sections?.length),
      smartplace: Boolean(results.smartplace?.detailBody || results.smartplace?.body),
      insta: Boolean(results.insta?.lineBreakBody || results.insta?.body),
      hashtag: Boolean(
        results.hashtag?.all?.length || results.hashtag?.localTags?.length
      ),
      image: Boolean(results.imagePrompt?.thumbnailPrompt),
    };
  }, [hasGenerated, results]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChannelTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        disabled={isGenerating}
        charCount={hasGenerated ? blogChars : null}
        blogLengthTier={formValues.blogLengthTier || "short"}
        channelReady={channelReady}
      />

      <div className={`relative min-h-0 flex-1 overflow-y-auto ${VISION_WORKSPACE_CANVAS}`}>
        <div className="mx-auto max-w-3xl p-4 pb-6">
          {hasGenerated && !isGenerating && (
            <>
              <MatrixBanner />
              <QualityPanel
                results={results}
                meta={engineMeta}
                blogLengthTier={formValues.blogLengthTier || "short"}
              />
              <ResultToolbar
                onCopyTab={onCopyTab}
                onCopyAll={onCopyAll}
                onDownload={onDownload}
                disabled={false}
              />
            </>
          )}
          <div className={`min-h-[280px] p-4 md:p-5 ${VISION_WORKSPACE_PANEL}`}>
            {isGenerating ? (
              <SkeletonPreview />
            ) : !hasGenerated ? (
              <EmptyState />
            ) : (
              <TabContent activeTab={activeTab} results={results} />
            )}
          </div>
        </div>
      </div>

      <div className={`shrink-0 border-t border-[var(--vision-line)] px-4 py-4 md:px-6 ${VISION_WORKSPACE_CANVAS}`}>
        <ContentForm
          values={formValues}
          errors={formErrors}
          onChange={onFormChange}
          onApplyPreset={onApplyPreset}
        >
          <div className="mt-3">
            <GenerateButton {...generateProps} />
          </div>
        </ContentForm>
      </div>
    </div>
  );
}
