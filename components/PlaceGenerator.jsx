"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeferredWorkspaceForm } from "@/lib/hooks/useDeferredWorkspaceForm";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import BaseContentCard from "@/components/BaseContentCard";
import ChannelStartScreen from "@/components/channels/ChannelStartScreen";
import PlaceMarketerForm from "@/components/channels/PlaceMarketerForm";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import EditablePlaceView from "@/components/EditablePlaceView";
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

export default function PlaceGenerator({ onGoBlog, onCopy, userId, brandId }) {
  const { blogInput, setBlogInput } = useContentForm();
  const {
    blogContent,
    placeContent,
    baseContentLabel,
    generating,
    hasFullBlog,
    hasOtherDraft,
    generatePlace,
    updatePlaceContent,
    saveEditedPlace,
    rewritePlaceContent,
    memoryContentIds,
    editorImprove,
    editorImproving,
  } = useContentPipelineState();
  const { activeBrand } = useBrandWorkspace();
  const { draft, setDraft, formApiRef, flushToCommitted } =
    useDeferredWorkspaceForm(blogInput, setBlogInput);
  const [preferStandalone, setPreferStandalone] =
    useChannelPreferStandalone("place");

  const runPlaceGenerate = useCallback(
    (opts = {}) => {
      const input = flushToCommitted();
      if (!input) return;
      const standalone =
        opts.preferStandalone !== undefined
          ? opts.preferStandalone
          : preferStandalone;
      generatePlace({
        ...opts,
        preferStandalone: standalone,
        inputOverride: input,
      });
    },
    [flushToCommitted, generatePlace, preferStandalone]
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
  const { layoutMode, concise, setLayoutMode } = useChannelLayoutMode("place");

  useEffect(() => {
    if (placeContent && isMobile) {
      setFormOpen(false);
    }
  }, [placeContent, isMobile]);

  useEffect(() => {
    if (isMobile && generating.place) {
      setFormOpen(false);
    }
  }, [isMobile, generating.place]);

  if (!placeContent) {
    return (
      <ChannelStartScreen
        channel="place"
        blogInput={blogInput}
        setBlogInput={setBlogInput}
        activeBrand={activeBrand}
        generating={generating.place}
        hasFullBlog={hasFullBlog}
        hasOtherDraft={hasOtherDraft}
        onGenerate={runPlaceGenerate}
        onGenerateFromDraft={() =>
          runPlaceGenerate({ preferStandalone: false })
        }
        onGoBlog={onGoBlog}
      />
    );
  }

  const copyText = formatTabForCopy("smartplace", { smartplace: placeContent });
  const handleCopy = () => onCopy?.(copyText);

  const hasContent = Boolean(placeContent);
  const isGenerating = generating.place;
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
    placeContent && copyText && (isMobile || (isTablet && concise));
  const collapseSecondary = concise && (isMobile || isTablet);

  const formPanel = (
    <>
      <WorkspaceChannelIntro
        compact={compact}
        title="플레이스 브리프"
        description="목표·사실·행동을 정한 뒤 다시 만들면 공지 품질이 올라갑니다."
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
        channel="place"
        preferStandalone={preferStandalone}
        onPreferStandaloneChange={setPreferStandalone}
        className={compact ? "mt-3" : "mt-4"}
      />
      <div className={compact ? "mt-3" : "mt-4"}>
        <PlaceMarketerForm
          values={draft}
          onChange={setBlogInput}
          onDraftChange={setDraft}
          formApiRef={formApiRef}
          compact={compact}
        />
      </div>
      {!isMobile ? (
        <>
          <button
            type="button"
            disabled={generating.place}
            onClick={() =>
              hasFullBlog && blogContent
                ? runPlaceGenerate({ preferStandalone: false })
                : runPlaceGenerate({ preferStandalone })
            }
            className="briclog-btn-primary mt-5 disabled:opacity-50"
          >
            {generating.place
              ? "만드는 중…"
              : placeContent
                ? "다시 만들기"
                : CHANNEL_PRODUCTS.place.generateLabel}
          </button>
          {hasFullBlog && blogContent && (
            <button
              type="button"
              disabled={generating.place}
              onClick={() => runPlaceGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-white py-2.5 text-[13px] font-semibold text-[var(--vision-ink)] hover:bg-[var(--vision-paper)] disabled:opacity-50"
            >
              {CHANNEL_PRODUCTS.place.deriveBlogLabel || "이야기에서 이어 만들기"}
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
          channel="place"
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
          channel="place"
          pane={mobilePane}
          onPaneChange={(next) => setFormOpen(next === "form")}
          resultReady={hasContent}
          isGenerating={isGenerating && !hasContent}
          resultTitle={placeContent?.title || null}
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
              disabled={generating.place}
              onClick={() =>
                hasFullBlog && blogContent
                  ? runPlaceGenerate({ preferStandalone: false })
                  : runPlaceGenerate({ preferStandalone })
              }
              className="briclog-btn-primary w-full disabled:opacity-50"
            >
              {generating.place
                ? "만드는 중…"
                : placeContent
                  ? "다시 만들기"
                  : CHANNEL_PRODUCTS.place.generateLabel}
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
        {placeContent?._meta?.baseLabel && (
          <p className="mb-4 text-[12px] text-[var(--vision-muted)]">
            <span className="font-medium text-[var(--vision-ink)]">기준</span>{" "}
            {placeContent._meta.baseLabel}
          </p>
        )}
        {generating.place ? (
          <GeneratingResultPlaceholder
            compact={compact}
            phase="writing"
            channelLabel="플레이스"
          />
        ) : placeContent ? (
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
            <EditablePlaceView
              place={placeContent}
              onCopy={onCopy}
              onChange={updatePlaceContent}
              onSave={saveEditedPlace}
              mobileView={isMobile}
              conciseView={concise}
            />
            <MobileSecondaryAccordion
              title="품질 · 피드백 · 다시쓰기"
              collapsed={collapseSecondary}
              className="mt-4"
            >
              {(placeContent.editorAI || placeContent._meta?.editorAI) && (
                <EditorAIReport
                  report={placeContent.editorAI || placeContent._meta?.editorAI}
                  channel="place"
                  compare={placeContent._meta?.editorCompare}
                  onImprove={(id) => editorImprove("place", id)}
                  improving={editorImproving}
                />
              )}
              {userId && (
                <ContentFeedbackPanel
                  contentItemId={memoryContentIds?.place}
                  brandId={brandId}
                  channel="place"
                  onReflect={async ({
                    feedbackText,
                    scope,
                    inputPatch,
                    tags,
                  }) =>
                    rewritePlaceContent(feedbackText, scope, {
                      source: "feedback",
                      tagIds: tags,
                      inputPatch,
                    })
                  }
                />
              )}
              <RewriteFeedbackPanel
                channel="place"
                content={placeContent}
                contentId={`place-${brandId || "x"}-${placeContent.title || "draft"}`}
                userId={userId}
                brandId={brandId}
                onRewrite={(text, scope) =>
                  rewritePlaceContent(text, scope, { source: "rewrite_panel" })
                }
                onApplyVersion={updatePlaceContent}
              />
            </MobileSecondaryAccordion>
            {showStickyCopy && <StickyCopyBar onCopy={handleCopy} />}
          </>
        ) : (
          <p className="text-center text-[14px] text-[var(--vision-muted)]">
            {isMobile
              ? "「공지」 탭에서 플레이스 소개글을 확인할 수 있어요"
              : "왼쪽에서 만들기 버튼을 눌러 주세요"}
          </p>
        )}
      </div>
      ) : null}
    </div>
  );
}
