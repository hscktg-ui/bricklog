"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeferredWorkspaceForm } from "@/lib/hooks/useDeferredWorkspaceForm";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import BaseContentCard from "@/components/BaseContentCard";
import ChannelStartScreen from "@/components/channels/ChannelStartScreen";
import InstaMarketerForm from "@/components/channels/InstaMarketerForm";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import EditableInstaView from "@/components/EditableInstaView";
import RewriteFeedbackPanel from "@/components/RewriteFeedbackPanel";
import ContentFeedbackPanel from "@/components/feedback/ContentFeedbackPanel";
import EditorAIReport from "@/components/EditorAIReport";
import ChannelLayoutToggle from "@/components/ChannelLayoutToggle";
import StickyCopyBar from "@/components/StickyCopyBar";
import MobileSecondaryAccordion from "@/components/MobileSecondaryAccordion";
import Icon from "@/components/Icon";
import GeneratingResultPlaceholder from "@/components/blog/GeneratingResultPlaceholder";
import {
  useContentForm,
  useContentPipelineState,
} from "@/context/ContentContext";
import { formatTabForCopy } from "@/lib/contentFormat";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import { useChannelLayoutMode } from "@/hooks/useChannelLayoutMode";
import { useEffectiveViewport } from "@/hooks/useEffectiveViewport";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import WorkspaceChannelIntro from "@/components/workspace/WorkspaceChannelIntro";
import ChannelGenPrefToggle, {
  useChannelPreferStandalone,
} from "@/components/channels/ChannelGenPrefToggle";
import {
  CHANNEL_WORKSPACE_SHELL,
  channelFormPaneClass,
  channelFormScrollClass,
  channelResultPaneClass,
  resolveChannelMobilePaneState,
  CHANNEL_MOBILE_CTA_FOOTER,
} from "@/lib/workspace/channelWorkspaceLayout";
import { useMobileWriteUx } from "@/hooks/useMobileWriteUx";
import MobileChannelChrome from "@/components/workspace/MobileChannelChrome";

export default function InstagramGenerator({ onGoBlog, onCopy, userId, brandId }) {
  const { blogInput, setBlogInput } = useContentForm();
  const {
    blogContent,
    baseContentLabel,
    instagramContent,
    instaTone,
    setInstaTone,
    generating,
    hasFullBlog,
    hasOtherDraft,
    generateInstagram,
    updateInstagramContent,
    saveEditedInstagram,
    rewriteInstagramContent,
    memoryContentIds,
    editorImprove,
    editorImproving,
  } = useContentPipelineState();
  const { activeBrand } = useBrandWorkspace();
  const { draft, setDraft, formApiRef, flushToCommitted } =
    useDeferredWorkspaceForm(blogInput, setBlogInput);
  const [localInstaTone, setLocalInstaTone] = useState(instaTone || "emotional");
  const [preferStandalone, setPreferStandalone] =
    useChannelPreferStandalone("insta");

  useEffect(() => {
    setLocalInstaTone(instaTone || "emotional");
  }, [blogInput.brandId, instaTone]);

  const runInstaGenerate = useCallback(
    (opts = {}) => {
      const input = flushToCommitted();
      if (!input) return;
      const standalone =
        opts.preferStandalone !== undefined
          ? opts.preferStandalone
          : preferStandalone;
      generateInstagram({
        ...opts,
        preferStandalone: standalone,
        inputOverride: input,
        instaToneOverride: localInstaTone,
      });
    },
    [flushToCommitted, generateInstagram, localInstaTone, preferStandalone]
  );

  const recentTopics = useMemo(
    () =>
      (activeBrand?.contentArchive?.blog || [])
        .map((b) => b?.title || b?.representativeTitle)
        .filter(Boolean)
        .slice(0, 5),
    [activeBrand?.contentArchive?.blog]
  );
  const generationCount = activeBrand?.contentArchive?.blog?.length ?? 0;

  const [formOpen, setFormOpen] = useState(true);
  const { isMobile, isTablet } = useEffectiveViewport();
  const { compact } = useWorkspaceCompact();
  const { formScrollPadClass, resultScrollPadClass } = useMobileWriteUx();
  const { layoutMode, concise, setLayoutMode } = useChannelLayoutMode("insta");

  useEffect(() => {
    if (instagramContent && isMobile) {
      setFormOpen(false);
    }
  }, [instagramContent, isMobile]);

  useEffect(() => {
    if (isMobile && generating.instagram) {
      setFormOpen(false);
    }
  }, [isMobile, generating.instagram]);

  if (!instagramContent) {
    return (
      <ChannelStartScreen
        channel="insta"
        blogInput={blogInput}
        setBlogInput={setBlogInput}
        activeBrand={activeBrand}
        instaTone={instaTone}
        setInstaTone={setInstaTone}
        generating={generating.instagram}
        hasFullBlog={hasFullBlog}
        hasOtherDraft={hasOtherDraft}
        onGenerate={runInstaGenerate}
        onGenerateFromDraft={() =>
          runInstaGenerate({ preferStandalone: false })
        }
        onGoBlog={onGoBlog}
      />
    );
  }

  const copyText = formatTabForCopy("insta", { insta: instagramContent });
  const handleCopy = () => onCopy?.(copyText);

  const hasContent = Boolean(instagramContent);
  const isGenerating = generating.instagram;
  const {
    mobileIdleEmpty,
    showMobileChrome,
    hideFormPanel,
    mobileHideResults,
    mobilePane,
  } = resolveChannelMobilePaneState({
    isMobile,
    hasContent,
    isGenerating,
    formOpen,
  });

  const showStickyCopy =
    instagramContent && copyText && (isMobile || (isTablet && concise));
  const collapseSecondary = concise && (isMobile || isTablet);

  const formPanel = (
    <>
      <WorkspaceChannelIntro
        compact={compact}
        title="인스타 캡션 브리프"
        description="캠페인 목표·후크·해시태그를 정한 뒤 만들면 맹목적인 문장이 줄어듭니다."
      />
      {blogContent && !compact && (
        <div className="mt-4">
          <BaseContentCard
            blog={blogContent}
            baseLabel={baseContentLabel}
            compact
          />
        </div>
      )}
      <ChannelGenPrefToggle
        channel="insta"
        preferStandalone={preferStandalone}
        onPreferStandaloneChange={setPreferStandalone}
        className={compact ? "mt-3" : "mt-4"}
      />
      <div className={compact ? "mt-3" : "mt-4"}>
        <InstaMarketerForm
          values={draft}
          onChange={setBlogInput}
          onDraftChange={setDraft}
          formApiRef={formApiRef}
          instaTone={localInstaTone}
          onInstaToneChange={setLocalInstaTone}
          compact={compact}
        />
      </div>
      {!isMobile ? (
        <>
          <button
            type="button"
            disabled={generating.instagram}
            onClick={() =>
              hasFullBlog && blogContent
                ? runInstaGenerate({ preferStandalone: false })
                : runInstaGenerate({ preferStandalone })
            }
            className="briclog-btn-primary mt-5 disabled:opacity-50"
          >
            {generating.instagram
              ? "만드는 중…"
              : instagramContent
                ? "다시 만들기"
                : CHANNEL_PRODUCTS.insta.generateLabel}
          </button>
          {hasFullBlog && blogContent && (
            <button
              type="button"
              disabled={generating.instagram}
              onClick={() => runInstaGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-white py-2.5 text-[13px] font-semibold text-[var(--vision-ink)] hover:bg-[var(--vision-paper)] disabled:opacity-50"
            >
              {CHANNEL_PRODUCTS.insta.deriveBlogLabel || "이야기에서 이어 만들기"}
            </button>
          )}
        </>
      ) : null}
      <MobileSecondaryAccordion
        title="TIP · 작성 맥락"
        collapsed={compact}
        className={compact ? "mt-3" : "mt-4"}
      >
        <DailyTimelinessPanel
          channel="insta"
          blogInput={draft}
          onChange={(next) => formApiRef.current?.patchImmediate?.(next)}
          brandName={draft.brandName || activeBrand?.brandName}
          brandMemory={activeBrand}
          recentTopics={recentTopics}
          generationCount={generationCount}
          compact={compact}
        />
      </MobileSecondaryAccordion>
    </>
  );

  return (
    <div className={CHANNEL_WORKSPACE_SHELL}>
      {showMobileChrome ? (
        <MobileChannelChrome
          channel="insta"
          pane={mobilePane}
          onPaneChange={(next) => setFormOpen(next === "form")}
          resultReady={hasContent}
          isGenerating={isGenerating && !hasContent}
          resultTitle={instagramContent?.hook || null}
        />
      ) : null}

      <div
        className={channelFormPaneClass({
          hide: hideFormPanel,
          mobileIdleFull: mobileIdleEmpty,
          width: "wide",
        })}
      >
        <div className={channelFormScrollClass(formScrollPadClass, compact)}>
          {formPanel}
        </div>
        {isMobile ? (
          <div className={CHANNEL_MOBILE_CTA_FOOTER}>
            <button
              type="button"
              disabled={generating.instagram}
              onClick={() =>
                hasFullBlog && blogContent
                  ? runInstaGenerate({ preferStandalone: false })
                  : runInstaGenerate({ preferStandalone })
              }
              className="briclog-btn-primary w-full disabled:opacity-50"
            >
              {generating.instagram
                ? "만드는 중…"
                : instagramContent
                  ? "다시 만들기"
                  : CHANNEL_PRODUCTS.insta.generateLabel}
            </button>
          </div>
        ) : null}
      </div>

      {!mobileHideResults ? (
      <div
        className={channelResultPaneClass({
          stickyCopy: showStickyCopy,
          resultScrollPadClass,
        })}
      >
        {!isMobile && (
          <div className="mb-4 flex justify-end">
            <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
          </div>
        )}
        {instagramContent?._meta?.baseLabel && (
          <p className="mb-4 text-[12px] text-[var(--vision-muted)]">
            <span className="font-medium text-[var(--vision-ink)]">기준</span>{" "}
            {instagramContent._meta.baseLabel}
          </p>
        )}
        {generating.instagram ? (
          <GeneratingResultPlaceholder
            compact={compact}
            phase="writing"
            channelLabel="인스타 캡션"
          />
        ) : instagramContent ? (
          <>
            {!showStickyCopy && (
              <div className="mb-4 flex justify-end lg:hidden">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--vision-line-strong)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--vision-ink)] hover:bg-[var(--vision-paper)]"
                >
                  <Icon name="copy" className="h-4 w-4" />
                  복사하기
                </button>
              </div>
            )}
            <EditableInstaView
              insta={instagramContent}
              onCopy={onCopy}
              onChange={updateInstagramContent}
              onSave={saveEditedInstagram}
              mobileView={isMobile}
              conciseView={concise}
            />
            <MobileSecondaryAccordion
              title="품질 · 피드백 · 다시쓰기"
              collapsed={collapseSecondary}
              className="mt-4"
            >
              {(instagramContent.editorAI ||
                instagramContent._meta?.editorAI) && (
                <EditorAIReport
                  report={
                    instagramContent.editorAI ||
                    instagramContent._meta?.editorAI
                  }
                  channel="instagram"
                  compare={instagramContent._meta?.editorCompare}
                  onImprove={(id) => editorImprove("instagram", id)}
                  improving={editorImproving}
                />
              )}
              {userId && (
                <ContentFeedbackPanel
                  contentItemId={memoryContentIds?.instagram}
                  brandId={brandId}
                  channel="instagram"
                  onReflect={async ({
                    feedbackText,
                    scope,
                    inputPatch,
                    tags,
                  }) =>
                    rewriteInstagramContent(feedbackText, scope, {
                      source: "feedback",
                      tagIds: tags,
                      inputPatch,
                    })
                  }
                />
              )}
              <RewriteFeedbackPanel
                channel="instagram"
                content={instagramContent}
                contentId={`insta-${brandId || "x"}-${instagramContent.hook || "draft"}`}
                userId={userId}
                brandId={brandId}
                onRewrite={(text, scope) =>
                  rewriteInstagramContent(text, scope, {
                    source: "rewrite_panel",
                  })
                }
                onApplyVersion={updateInstagramContent}
              />
            </MobileSecondaryAccordion>
            {showStickyCopy && <StickyCopyBar onCopy={handleCopy} />}
          </>
        ) : (
          <p className="text-center text-[14px] text-[var(--vision-muted)]">
            {isMobile
              ? "「캡션」 탭에서 결과를 확인할 수 있어요"
              : "왼쪽에서 만들기 버튼을 눌러 주세요"}
          </p>
        )}
      </div>
      ) : null}
    </div>
  );
}
