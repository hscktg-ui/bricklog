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
  const { layoutMode, concise, setLayoutMode } = useChannelLayoutMode("place");

  useEffect(() => {
    if (placeContent && isMobile && concise) {
      setFormOpen(false);
    }
  }, [placeContent, isMobile, concise]);

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

  const hideFormPanel = isMobile && concise && placeContent && !formOpen;
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
      <button
        type="button"
        disabled={generating.place}
        onClick={() =>
          hasFullBlog && blogContent
            ? runPlaceGenerate({ preferStandalone: false })
            : runPlaceGenerate({ preferStandalone })
        }
        className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
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
          className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#03C75A]/40 bg-[#F8FDF9] py-2.5 text-[13px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF] disabled:opacity-50"
        >
          {CHANNEL_PRODUCTS.place.deriveBlogLabel || "이야기에서 이어 만들기"}
        </button>
      )}
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
    <div className="workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      {placeContent && isMobile && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EBED] bg-[#F7F8FA] px-4 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="min-h-[40px] rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px] font-semibold text-[#4E5968]"
          >
            {formOpen ? "본문 보기" : "만들기·옵션"}
          </button>
          <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
        </div>
      )}

      <div
        className={`min-h-0 w-full shrink-0 overflow-y-auto border-[#E8EBED] bg-[#F7F8FA] p-4 md:border-r md:p-6 md:w-[320px] lg:w-[400px] ${
          hideFormPanel ? "hidden" : "max-md:border-b md:block"
        }`}
      >
        {formPanel}
      </div>

      <div
        className={`workspace-result-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 md:p-6 lg:p-8 ${
          showStickyCopy ? "has-sticky-copy" : ""
        }`}
      >
        {!isMobile && (
          <div className="mb-4 flex justify-end">
            <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
          </div>
        )}
        {placeContent?._meta?.baseLabel && (
          <p className="mb-4 text-[12px] text-[#8B95A1]">
            <span className="font-medium text-[#03A94D]">기준</span>{" "}
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
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] font-medium hover:bg-[#F7F8FA]"
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
          <p className="text-center text-[14px] text-[#8B95A1]">
            {isMobile && concise
              ? "「만들기·옵션」에서 플레이스 소개글을 만들어 주세요"
              : "왼쪽에서 만들기 버튼을 눌러 주세요"}
          </p>
        )}
      </div>
    </div>
  );
}
