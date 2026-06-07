"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmptyStoryPanel from "@/components/product/EmptyStoryPanel";
import { EMPTY_STORY, MOBILE_STORY, WORKSPACE_BLOG } from "@/lib/product/craft";
import ChannelLayoutToggle from "@/components/ChannelLayoutToggle";
import StickyCopyBar from "@/components/StickyCopyBar";
import { useChannelLayoutMode } from "@/hooks/useChannelLayoutMode";
import { useEffectiveViewport } from "@/hooks/useEffectiveViewport";
import { useMobileWriteUx } from "@/hooks/useMobileWriteUx";
import MobileStoryChrome from "@/components/workspace/MobileStoryChrome";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import WorkspaceChannelIntro from "@/components/workspace/WorkspaceChannelIntro";
import BlogForm from "@/components/BlogForm";
import MobileSecondaryAccordion from "@/components/MobileSecondaryAccordion";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import UploadGuidePanel from "@/components/UploadGuidePanel";
import BlogResultView from "@/components/BlogResultView";
import BaseContentCard from "@/components/BaseContentCard";
import PipelineQuickActions from "@/components/PipelineQuickActions";
import ResearchSummaryStrip from "@/components/research/ResearchSummaryStrip";
import BriclogPerspectiveNote from "@/components/BriclogPerspectiveNote";
import BrandHabitStrip from "@/components/BrandHabitStrip";
import Icon from "@/components/Icon";
import {
  useContentForm,
  useContentPipelineState,
} from "@/context/ContentContext";
import { resolveBlogHintPanelTitle } from "@/lib/product/customerOutput";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import {
  isFormValid as checkFormValid,
  validateForm,
} from "@/lib/formValidation";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { saveFormDraft } from "@/lib/formDraft";
import {
  loadBlogOnlyPref,
  saveBlogOnlyPref,
  saveChannelGenPref,
} from "@/lib/preferences/channelGenerationPrefs";
import { useDeferredWorkspaceForm } from "@/lib/hooks/useDeferredWorkspaceForm";
import AiServiceStatus from "@/components/AiServiceStatus";
import ChannelResultsTabs from "@/components/ChannelResultsTabs";
import { trackContentEvent } from "@/lib/feedback/trackEvent";
import EditablePlaceView from "@/components/EditablePlaceView";
import EditableInstaView from "@/components/EditableInstaView";
import ResearchResultPanel from "@/components/research/ResearchResultPanel";
import {
  enrichQuickDemoFromMemory,
  resolveQuickDemoInput,
} from "@/lib/onboarding/resolveQuickDemoInput";
import ChannelPackToggle from "@/components/blog/ChannelPackToggle";
import GeneratingResultPlaceholder from "@/components/blog/GeneratingResultPlaceholder";
import ChannelExpandCard from "@/components/product/ChannelExpandCard";
import { RESULT_VIEW, RETRY } from "@/lib/product/craft";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";
import GenerationStayBanner from "@/components/blog/GenerationStayBanner";
import { useGenerationLeaveGuard } from "@/hooks/useGenerationLeaveGuard";
import GenerationQuotaHint from "@/components/billing/GenerationQuotaHint";
import QuotaExhaustedCallout from "@/components/billing/QuotaExhaustedCallout";
import { useBillingUsage } from "@/hooks/useBillingUsage";
import { isContentQuotaExhausted } from "@/lib/billing/planUx";
import { useSimpleWorkspaceMode } from "@/hooks/useSimpleWorkspaceMode";
import {
  countBrandBlogGenerations,
  getRecentBlogTitle,
  shouldShowHistoryShortcut,
  shouldShowQuickDemo,
  shouldUseCompactChannelPackCopy,
  isMatureBlogUser,
} from "@/lib/workspace/usageMaturity";

const BlogEditorFormPane = memo(function BlogEditorFormPane({
  onNavigate,
  userId,
  brandId,
  activeBrand,
  hideFormPanel,
  mobileIdleFull = false,
  onStartGenerate,
  onPlanChange,
}) {
  const goHistory =
    typeof onNavigate === "function"
      ? () => onNavigate("history")
      : null;
  const {
    blogInput,
    setBlogInput,
    touched,
    setTouched,
    signupDraftRestored,
    acknowledgeSignupDraft,
  } = useContentForm();
  const {
    blogContent,
    placeContent,
    instagramContent,
    generating,
    generateBlog,
    llmStatus,
    blogGenHint,
    blogGenHintSoft,
    memoryContentIds,
    user,
    demoMode,
    billingPlanId,
    billingBypassQuotas,
    loadingOverlay,
  } = useContentPipelineState();

  const storyBusy =
    generating.blog ||
    Boolean(
      loadingOverlay?.active &&
        (loadingOverlay.channel === "blog" ||
          loadingOverlay.channel === "pipeline")
    );

  /** 이전 생성 실패 후 진행 중 오버레이만 남으면 「이야기 쓰기」 복구 (완료 애니메이션은 유지) */
  useEffect(() => {
    if (generating.blog || loadingOverlay?.complete) return;
    if (
      loadingOverlay?.active &&
      (loadingOverlay.channel === "blog" ||
        loadingOverlay.channel === "pipeline")
    ) {
      window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
    }
  }, [
    generating.blog,
    loadingOverlay?.active,
    loadingOverlay?.complete,
    loadingOverlay?.channel,
  ]);

  const { usage: billingUsage, phase: billingPhase } = useBillingUsage();
  const { simpleMode } = useSimpleWorkspaceMode(userId);
  const quotaExhausted =
    !demoMode &&
    !billingBypassQuotas &&
    isContentQuotaExhausted(billingUsage);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [blogOnly, setBlogOnly] = useState(false);
  const {
    draft: draftForm,
    setDraft: setDraftForm,
    formApiRef,
    patchDraft: patchDraftImmediate,
  } = useDeferredWorkspaceForm(blogInput, setBlogInput);
  const debouncedDraftForSave = useDebouncedValue(draftForm, 900);
  const { isMobile } = useEffectiveViewport();
  const { formScrollPadClass } = useMobileWriteUx();

  useEffect(() => {
    setBlogOnly(loadBlogOnlyPref());
  }, []);

  useEffect(() => {
    if (generating.blog) return undefined;
    const persist = () => saveFormDraft(debouncedDraftForSave, userId);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(persist, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    persist();
    return undefined;
  }, [debouncedDraftForSave, userId, generating.blog]);
  const { compact } = useWorkspaceCompact();
  const { layoutMode, setLayoutMode } = useChannelLayoutMode("blog");

  const applyTopic = (text) => {
    const base = formApiRef.current?.getValues?.() ?? draftForm;
    const main = base.mainKeyword || text.split(/[,，]/)[0]?.trim() || text;
    patchDraftImmediate({ topic: text, mainKeyword: main });
  };

  const quickWriteFromTopic = (text) => {
    applyTopic(text);
  };

  const patchDraftFromPanel = useCallback((next) => {
    formApiRef.current?.patchImmediate?.(next);
  }, []);

  const getLiveFormValues = useCallback(
    () => formApiRef.current?.getValues?.() ?? draftForm,
    [draftForm]
  );

  const formValidNow = checkFormValid(getLiveFormValues());

  const commitAndGenerate = useCallback(
    (values) => {
      const topic = values.topic?.trim();
      const next = { ...values };
      if (topic && !next.mainKeyword?.trim()) {
        next.mainKeyword = topic.split(/[,，]/)[0].trim();
      }
      formApiRef.current?.replaceAll?.(next);
      setDraftForm(next);
      setTouched(true);
      onStartGenerate?.();
      generateBlog(next, { blogOnly });
    },
    [generateBlog, blogOnly, setTouched, setDraftForm, onStartGenerate]
  );

  const runGenerate = useCallback(() => {
    commitAndGenerate(getLiveFormValues());
  }, [commitAndGenerate, getLiveFormValues]);

  const runQuickDemo = useCallback(async () => {
    if (generating.blog) return;
    const { patch, needsMemoryFetch } = resolveQuickDemoInput({
      userId,
      brandId,
      activeBrand,
    });
    let seed = patch;
    if (needsMemoryFetch) {
      seed = await enrichQuickDemoFromMemory(patch, { brandId });
    }
    const merged = {
      ...getLiveFormValues(),
      ...seed,
    };
    commitAndGenerate(merged);
  }, [
    commitAndGenerate,
    generating.blog,
    getLiveFormValues,
    userId,
    brandId,
    activeBrand,
  ]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
      if (!formValidNow || generating.blog) return;
      e.preventDefault();
      runGenerate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formValidNow, generating.blog, runGenerate]);

  const recentTopics = useMemo(() => {
    const archive = activeBrand?.contentArchive?.blog || [];
    return archive
      .map((b) => b?.title || b?.representativeTitle)
      .filter(Boolean)
      .slice(0, 5);
  }, [activeBrand?.contentArchive?.blog]);

  const generationCount = countBrandBlogGenerations(activeBrand);
  const showQuickDemo = shouldShowQuickDemo({ generationCount, demoMode });

  const applyScene = (scene) => {
    const base = formApiRef.current?.getValues?.() ?? draftForm;
    const cur = base.includePhrases?.trim();
    const next = cur ? `${cur}, ${scene}` : scene;
    patchDraftImmediate({ includePhrases: next });
  };

  const draftErrors = useMemo(
    () => (touched ? validateForm(getLiveFormValues()) : {}),
    [touched, draftForm, getLiveFormValues]
  );

  const disabledReason =
    !generating.blog && !formValidNow
      ? draftErrors.region ||
        draftErrors.topic ||
        draftErrors.brandName ||
        "브랜드 · 지역 · 주제를 입력해 주세요"
      : null;

  const generatingNote = isMobile
    ? MOBILE_STORY.generatingNote
    : WORKSPACE_BLOG.generatingNote;

  return (
    <>
      <div
        className={`flex min-h-0 w-full shrink-0 flex-col border-[#E8EBED] bg-white lg:block lg:w-[min(380px,38vw)] lg:max-w-[420px] lg:border-r ${
          hideFormPanel ? "max-lg:hidden" : ""
        } ${mobileIdleFull ? "max-lg:min-h-0 max-lg:flex-1" : "max-lg:max-h-[min(46dvh,420px)] max-lg:border-b"}`}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto ${formScrollPadClass} ${compact ? "p-3" : "p-4"} md:p-6`}
        >
          {isMobile && blogGenHint ? (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${
                blogGenHintSoft
                  ? "border-[#03C75A]/25 bg-[#F0FFF5] text-[#4E5968]"
                  : "border-[#FFE0B2] bg-[#FFF8E6] text-[#4E5968]"
              }`}
              role="status"
            >
              <p className="font-semibold text-[#191F28]">
                {resolveBlogHintPanelTitle(blogGenHint, blogGenHintSoft)}
              </p>
              <p className="mt-1">{blogGenHint}</p>
            </div>
          ) : null}

          <WorkspaceChannelIntro
            compact={compact}
            title={WORKSPACE_BLOG.title}
            description={
              isMobile
                ? MOBILE_STORY.tagline
                : compact
                  ? WORKSPACE_BLOG.taglineCompact
                  : WORKSPACE_BLOG.tagline
            }
            warning={
              !activeBrand?.brandName && !draftForm.brandName?.trim()
                ? "사이드바 「+ 브랜드 추가」 또는 아래 브랜드명을 입력해 주세요"
                : null
            }
          />

          {signupDraftRestored && formValidNow && !blogContent && !generating.blog ? (
            <div
              className="mt-4 rounded-xl border border-[#03C75A]/30 bg-[#F6FDF9] px-4 py-3"
              role="status"
            >
              <p className="text-[13px] font-bold text-[#191F28]">
                가입 전 입력이 그대로 채워졌어요
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
                아래 「{WORKSPACE_BLOG.cta}」만 누르시면 첫 편집본을 받을 수 있어요.
              </p>
              <button
                type="button"
                onClick={acknowledgeSignupDraft}
                className="mt-2 text-[11px] font-semibold text-[#8B95A1] hover:text-[#4E5968]"
              >
                닫기
              </button>
            </div>
          ) : null}

          {!compact && (
            <div className="mt-4 space-y-3">
              <BriclogPerspectiveNote compact={simpleMode} />
              <BrandHabitStrip />
            </div>
          )}

          {!compact && !simpleMode && (
            <AiServiceStatus
              llmAvailable={llmStatus.llmAvailable}
              mode={llmStatus.mode}
              operatorHint={llmStatus.operatorHint}
              compact
            />
          )}

          {showQuickDemo &&
            !simpleMode &&
            !isMobile &&
            !blogContent &&
            !generating.blog && (
            <>
              <button
                type="button"
                className="briclog-btn-secondary mt-3 w-full text-[13px]"
                onClick={runQuickDemo}
              >
                {WORKSPACE_BLOG.exampleCta}
              </button>
              {WORKSPACE_BLOG.exampleHint ? (
                <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8B95A1]">
                  {WORKSPACE_BLOG.exampleHint}
                </p>
              ) : null}
            </>
          )}

          {storyBusy && (
            <div className={`${compact ? "mt-3" : "mt-4"}`}>
              <GenerationStayBanner variant="form" />
            </div>
          )}

          <div
            className={`${compact ? "mt-3" : "mt-5"} ${
              storyBusy ? "pointer-events-none opacity-55" : ""
            }`}
            aria-busy={storyBusy || undefined}
          >
            {generating.blog && !blogContent && (
              <p className="mb-3 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 text-[12px] leading-relaxed text-[#8B95A1]">
                {generatingNote}
              </p>
            )}
            <BlogForm
              values={draftForm}
              errors={touched ? draftErrors : {}}
              onChange={setBlogInput}
              onDraftChange={setDraftForm}
              formApiRef={formApiRef}
              advancedOpen={advancedOpen}
              onAdvancedToggle={() => setAdvancedOpen((o) => !o)}
              compact={compact}
              simpleMode={simpleMode}
              mobileSimplified={isMobile}
              deferParentSync
            />
          </div>

          {!generating.blog && (
            <ChannelPackToggle
              blogOnly={blogOnly}
              compactCopy={isMobile || shouldUseCompactChannelPackCopy(generationCount)}
              disabled={storyBusy}
              onChange={(only) => {
                setBlogOnly(only);
                saveBlogOnlyPref(only);
                saveChannelGenPref("blog", { blogOnly: only });
              }}
            />
          )}

          {quotaExhausted && (
            <QuotaExhaustedCallout
              planId={billingPlanId}
              onUpgradeClick={onPlanChange}
            />
          )}

          {!isMobile ? (
            <button
              type="button"
              data-briclog-generate="blog"
              disabled={
                !formValidNow ||
                storyBusy ||
                quotaExhausted
              }
              onClick={runGenerate}
              className="briclog-btn-primary mt-6 disabled:opacity-50"
            >
              {storyBusy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="briclog-spinner h-4 w-4 border-white/30 border-t-white"
                    aria-hidden
                  />
                  <span>{WORKSPACE_BLOG.ctaBusy}</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Icon name="document" className="h-5 w-5" />
                  <span>
                    {llmStatus.llmAvailable === false
                      ? "구성안 만들기"
                      : WORKSPACE_BLOG.cta}
                  </span>
                </span>
              )}
            </button>
          ) : null}
          {!isMobile && !demoMode && !quotaExhausted && (
            <GenerationQuotaHint usage={billingUsage} phase={billingPhase} />
          )}
          {formValidNow && !generating.blog && !quotaExhausted && !isMobile && (
            <p className="mt-2 text-center text-[11px] text-[#B0B8C1]">
              {WORKSPACE_BLOG.shortcutHint}
            </p>
          )}
          {disabledReason && !generating.blog && !isMobile && (
            <p className="mt-2 text-center text-[12px] text-[#E67700]">
              {disabledReason}
            </p>
          )}

          {shouldShowHistoryShortcut(generationCount) && goHistory && (
            <button
              type="button"
              onClick={goHistory}
              className="mt-3 w-full text-center text-[12px] font-semibold text-[#03A94D] hover:underline"
            >
              {EMPTY_STORY.historyCta}
              {getRecentBlogTitle(activeBrand)
                ? ` · ${getRecentBlogTitle(activeBrand)}`
                : ""}
            </button>
          )}

          {blogContent && !compact && (
            <PipelineQuickActions
              onNavigate={onNavigate}
              simpleMode={simpleMode}
              billingPlanId={billingPlanId}
              onUpgradeClick={onPlanChange}
            />
          )}

          {!simpleMode && !isMobile && (
          <MobileSecondaryAccordion
            title="TIP · 작성 맥락"
            collapsed={compact}
            className={compact ? "mt-3" : "mt-6"}
          >
            <DailyTimelinessPanel
              blogInput={draftForm}
              onChange={patchDraftFromPanel}
              brandName={draftForm.brandName || activeBrand?.brandName}
              brandMemory={activeBrand}
              recentTopics={recentTopics}
              generationCount={generationCount}
              onPickTopic={applyTopic}
              onPickScene={applyScene}
              onQuickWrite={quickWriteFromTopic}
              canQuickWrite={formValidNow}
              compact={compact}
            />
          </MobileSecondaryAccordion>
          )}
        </div>

        {isMobile ? (
          <div className="shrink-0 border-t border-[#E8EBED] bg-white/95 px-4 py-3 backdrop-blur-md">
            {!demoMode && !quotaExhausted ? (
              <GenerationQuotaHint usage={billingUsage} phase={billingPhase} />
            ) : null}
            {disabledReason && !generating.blog ? (
              <p className="mb-2 text-center text-[12px] text-[#E67700]">
                {disabledReason}
              </p>
            ) : null}
            <button
              type="button"
              data-briclog-generate="blog"
              disabled={
                !formValidNow ||
                storyBusy ||
                quotaExhausted
              }
              onClick={runGenerate}
              className="briclog-btn-primary w-full disabled:opacity-50"
            >
              {storyBusy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="briclog-spinner h-4 w-4 border-white/30 border-t-white"
                    aria-hidden
                  />
                  <span>{WORKSPACE_BLOG.ctaBusy}</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Icon name="document" className="h-5 w-5" />
                  <span>
                    {llmStatus.llmAvailable === false
                      ? "구성안 만들기"
                      : WORKSPACE_BLOG.cta}
                  </span>
                </span>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
});

const BlogEditorResults = memo(function BlogEditorResults({
  onCopy,
  onNavigate,
  userId,
  brandId,
  activeBrand,
  hideFormPanel = false,
  mobileHidden = false,
  billingPlanId = "free",
}) {
  const {
    blogContent,
    placeContent,
    instagramContent,
    imagePrompts,
    baseContentLabel,
    generating,
    generateBlog,
    blogGenHint,
    blogGenHintIsAuth,
    blogGenHintSoft,
    loadingOverlay,
    onToast,
    acknowledgeBlogResultDisplayed,
    updateBlogContent,
    saveEditedBlog,
    updatePlaceContent,
    saveEditedPlace,
    updateInstagramContent,
    saveEditedInstagram,
    rewriteBlogContent,
    editorImprove,
    editorImproving,
    memoryContentIds,
    researchResult,
  } = useContentPipelineState();
  const { blogInput } = useContentForm();

  const [resultTab, setResultTab] = useState("blog");
  const resultScrollRef = useRef(null);
  const { isMobile, isTablet } = useEffectiveViewport();
  const { resultScrollPadClass } = useMobileWriteUx();
  const { compact } = useWorkspaceCompact();
  const { layoutMode, concise, setLayoutMode } = useChannelLayoutMode("blog");
  const { simpleMode } = useSimpleWorkspaceMode(userId);
  const generationCount = countBrandBlogGenerations(activeBrand);
  const showHistoryLink =
    shouldShowHistoryShortcut(generationCount) && typeof onNavigate === "function";
  const recentTitle = getRecentBlogTitle(activeBrand);
  const showChannelTabs =
    !simpleMode ||
    Boolean(placeContent || instagramContent || imagePrompts);

  useEffect(() => {
    if (!showChannelTabs && resultTab !== "blog") setResultTab("blog");
  }, [showChannelTabs, resultTab]);

  const showStickyCopy =
    blogContent &&
    resultTab === "blog" &&
    blogContent.fullCopyText &&
    (isMobile || (isTablet && concise));

  const handleRegenerate = useCallback(() => {
    generateBlog(blogInput, { blogOnly: loadBlogOnlyPref() });
  }, [generateBlog, blogInput]);

  const regenerateBusy =
    generating.blog ||
    Boolean(
      loadingOverlay?.active &&
        (loadingOverlay.channel === "blog" ||
          loadingOverlay.channel === "pipeline")
    );

  const hasDeliveredBlog =
    Boolean(blogContent?.sections?.length) ||
    Boolean(String(blogContent?.fullCopyText || "").trim());

  const pipelineBusy =
    Boolean(loadingOverlay?.active) &&
    loadingOverlay?.channel === "pipeline";

  const showResultPlaceholder =
    !hasDeliveredBlog &&
    (generating.blog || pipelineBusy || Boolean(loadingOverlay?.active));

  const showFullResult = hasDeliveredBlog;

  useEffect(() => {
    if (!showFullResult || !blogContent) return;
    if (
      loadingOverlay?.active &&
      (loadingOverlay?.channel === "pipeline" ||
        loadingOverlay?.channel === "blog")
    ) {
      return;
    }
    window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
    resultScrollRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }, [
    showFullResult,
    blogContent,
    loadingOverlay?.active,
    loadingOverlay?.channel,
  ]);

  if (mobileHidden) return null;

  return (
      <div
        ref={resultScrollRef}
        className={`workspace-result-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F8FA] p-4 md:p-6 lg:p-8 ${resultScrollPadClass} ${
          showStickyCopy ? "has-sticky-copy" : ""
        } ${hideFormPanel ? "max-lg:min-h-0" : ""}`}
      >
        {showResultPlaceholder ? (
          <GeneratingResultPlaceholder
            compact={compact}
            phase="writing"
            previewTitle={
              blogContent?.representativeTitle ||
              blogContent?.title ||
              null
            }
            stepLabel={loadingOverlay?.stepLabel}
            startedAt={loadingOverlay?.startedAt}
          />
        ) : showFullResult ? (
          <>
            {blogContent?._meta?.completeDraft ? (
              <div className="mb-4 rounded-xl border border-[#03C75A]/25 bg-[#F6FDF9] px-4 py-3">
                <p className="text-[13px] font-semibold text-[#191F28]">
                  {RESULT_VIEW.completeBannerTitle}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
                  {RESULT_VIEW.completeBannerBody}
                </p>
              </div>
            ) : blogContent?._meta?.deliveryPreview ? (
              <div className="mb-4 rounded-xl border border-[#E8EBED] bg-white px-4 py-3">
                <p className="text-[13px] font-semibold text-[#191F28]">
                  {RESULT_VIEW.draftBannerTitle}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
                  {blogContent._meta?.deliveryPreviewMessage ||
                    RESULT_VIEW.draftBannerBody}
                </p>
              </div>
            ) : null}
            {!placeContent &&
            !instagramContent &&
            blogContent?._meta?.completeDraft &&
            typeof onNavigate === "function" ? (
              <ChannelExpandCard
                className="mb-4"
                onGoPlace={() => onNavigate("place")}
                onGoInsta={() => onNavigate("insta")}
              />
            ) : null}
            {!simpleMode && !isMobile && (
              <div className="mb-4 flex items-center justify-end gap-3">
                <ChannelLayoutToggle
                  layoutMode={layoutMode}
                  onChange={setLayoutMode}
                />
              </div>
            )}
            {showChannelTabs && (
            <ChannelResultsTabs
              activeTab={resultTab}
              onTabChange={(tab) => {
                setResultTab(tab);
                trackContentEvent({
                  eventType: "tab_channel",
                  brandId,
                  channel: tab,
                  contentItemId: memoryContentIds?.[tab] || memoryContentIds?.blog,
                  meta: { tab },
                });
              }}
              hasBlog={!!blogContent}
              hasPlace={!!placeContent}
              hasInsta={!!instagramContent}
              hasImage={!!imagePrompts}
            />
            )}
            {resultTab === "blog" && (
              <>
                {simpleMode && researchResult?.summary ? (
                  <ResearchSummaryStrip
                    result={researchResult}
                    researchFacts={blogInput?.researchFacts}
                    query={blogInput?.researchQuery || blogInput?.topic}
                  />
                ) : null}
                {!simpleMode && (
                <ResearchResultPanel
                  result={researchResult}
                  query={blogInput.researchQuery}
                  types={blogInput.researchTypes}
                />
                )}
                {!simpleMode && !(concise && isMobile) && (
                  <div className="mb-6 max-md:hidden md:block">
                    <BaseContentCard
                      blog={blogContent}
                      baseLabel={baseContentLabel}
                    />
                  </div>
                )}
                {!simpleMode && !(concise && isMobile) && (
                  <details className="mb-6 rounded-xl border border-[#E8EBED] bg-white">
                    <summary className="min-h-[44px] cursor-pointer px-4 py-3 text-[13px] font-medium text-[#4E5968]">
                      발행 전 참고 (선택)
                    </summary>
                    <div className="border-t border-[#E8EBED] px-4 pb-4">
                      <UploadGuidePanel
                        blog={blogContent}
                        place={placeContent}
                        insta={instagramContent}
                      />
                    </div>
                  </details>
                )}
                <BlogResultView
                  blog={blogContent}
                  blogInput={blogInput}
                  hasPlace={!!placeContent}
                  hasInsta={!!instagramContent}
                  billingPlanId={billingPlanId}
                  onToast={onToast}
                  onNavigate={onNavigate}
                  onResultDisplayed={acknowledgeBlogResultDisplayed}
                  conciseView={concise || isMobile}
                  mobileView={isMobile}
                  onRegenerate={handleRegenerate}
                  regenerateBusy={regenerateBusy}
                  onCopy={(text) => {
                    onCopy?.(text);
                    trackContentEvent({
                      eventType: "copy_all",
                      brandId,
                      contentItemId: memoryContentIds?.blog,
                      channel: "blog",
                    });
                    const readiness = resolvePublishReadiness(blogContent);
                    onToast?.(
                      readiness.status === "ready"
                        ? "복사됐어요. 네이버 블로그에 붙여 넣고 발행하시면 됩니다."
                        : "복사됐어요. 올리기 전에 한 번 더 읽어 보세요.",
                      "success"
                    );
                  }}
                  onChange={updateBlogContent}
                  onSave={saveEditedBlog}
                  similarity={blogContent._meta?.similarity}
                  userId={userId}
                  brandId={brandId}
                  contentItemId={memoryContentIds?.blog}
                  onRewrite={rewriteBlogContent}
                  onEditorImprove={(actionId) => editorImprove("blog", actionId)}
                  editorImproving={editorImproving}
                  onFeedbackReflected={() => setResultTab("blog")}
                />
                {showStickyCopy && (
                  <StickyCopyBar
                    onCopy={() => {
                      onCopy?.(blogContent.fullCopyText);
                      trackContentEvent({
                        eventType: "copy_all",
                        brandId,
                        contentItemId: memoryContentIds?.blog,
                        channel: "blog",
                      });
                    }}
                  />
                )}
              </>
            )}
            {resultTab === "place" && placeContent && (
              <EditablePlaceView
                place={placeContent}
                onChange={updatePlaceContent}
                onSave={saveEditedPlace}
                onCopy={() => {
                  onCopy?.("place", placeContent);
                  trackContentEvent({
                    eventType: "copy_channel",
                    brandId,
                    contentItemId: memoryContentIds?.place,
                    channel: "place",
                  });
                }}
              />
            )}
            {resultTab === "place" && !placeContent && (
              <p className="text-center text-[14px] text-[#8B95A1]">
                스마트플레이스를 생성하는 중이거나 블로그 생성 후 자동으로
                채워집니다.
              </p>
            )}
            {resultTab === "instagram" && instagramContent && (
              <EditableInstaView
                insta={instagramContent}
                onChange={updateInstagramContent}
                onSave={saveEditedInstagram}
                onCopy={() => {
                  onCopy?.("instagram", instagramContent);
                  trackContentEvent({
                    eventType: "copy_channel",
                    brandId,
                    contentItemId: memoryContentIds?.instagram,
                    channel: "instagram",
                  });
                }}
              />
            )}
            {resultTab === "instagram" && !instagramContent && (
              <p className="text-center text-[14px] text-[#8B95A1]">
                인스타그램 문구는 블로그 생성 후 자동으로 준비됩니다.
              </p>
            )}
            {resultTab === "image" && imagePrompts && (
              <div className="rounded-xl border border-[#E8EBED] bg-white p-5">
                <p className="text-[13px] font-semibold text-[#191F28]">
                  썸네일 문구
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4E5968]">
                  {imagePrompts.activePrompt ||
                    imagePrompts.thumbnailPrompt ||
                    "문구 없음"}
                </pre>
              </div>
            )}
            {resultTab === "image" && !imagePrompts && (
              <p className="text-center text-[14px] text-[#8B95A1]">
                썸네일 문구는 「썸네일 문구」 메뉴에서 이어 만들 수 있어요.
              </p>
            )}
          </>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col justify-center py-16">
            {blogGenHint ? (
              <div
                className={`rounded-2xl border px-5 py-4 text-center ${
                  blogGenHintSoft
                    ? "border-[#03C75A]/25 bg-[#F0FFF5]"
                    : "border-[#FFE0B2] bg-[#FFF8E6]"
                }`}
              >
                <p className="text-[14px] font-semibold text-[#191F28]">
                  {resolveBlogHintPanelTitle(blogGenHint, blogGenHintSoft)}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4E5968]">
                  {blogGenHint}
                </p>
                {!blogGenHintIsAuth ? (
                  <p className="mt-3 text-[12px] text-[#8B95A1]">
                    왼쪽 폼에서 「조사 후 글 받기」로 이어갈 수 있어요.
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyStoryPanel
                compact={compact}
                mobile={isMobile}
                hint={
                  isMatureBlogUser(generationCount) || simpleMode
                    ? EMPTY_STORY.hintMature
                    : compact
                      ? EMPTY_STORY.hintCompact
                      : EMPTY_STORY.hint
                }
                onOpenHistory={
                  showHistoryLink ? () => onNavigate("history") : null
                }
                historyLabel={recentTitle}
              />
            )}
          </div>
        )}
      </div>
  );
});

export default function BlogEditor({
  onNavigate,
  onCopy,
  userId,
  brandId,
  onPlanChange,
}) {
  const { activeBrand } = useBrandWorkspace();
  const {
    blogContent,
    placeContent,
    instagramContent,
    billingPlanId,
    generating,
    loadingOverlay,
  } = useContentPipelineState();

  const leaveGuardActive =
    generating.blog ||
    (loadingOverlay?.active &&
      (loadingOverlay.channel === "blog" ||
        loadingOverlay.channel === "pipeline"));

  useGenerationLeaveGuard(leaveGuardActive);
  const { isMobile } = useEffectiveViewport();
  const [formOpen, setFormOpen] = useState(true);

  useEffect(() => {
    if ((blogContent || placeContent || instagramContent) && isMobile) {
      setFormOpen(false);
    }
  }, [blogContent, placeContent, instagramContent, isMobile]);

  useEffect(() => {
    if (
      isMobile &&
      (generating.blog || loadingOverlay?.active)
    ) {
      setFormOpen(false);
    }
  }, [isMobile, generating.blog, loadingOverlay?.active]);

  const storyBusy =
    generating.blog ||
    Boolean(
      loadingOverlay?.active &&
        (loadingOverlay.channel === "blog" ||
          loadingOverlay.channel === "pipeline")
    );

  const hasDeliveredBlog =
    Boolean(blogContent?.sections?.length) ||
    Boolean(String(blogContent?.fullCopyText || "").trim());

  const hasAnyChannelResult =
    hasDeliveredBlog || Boolean(placeContent) || Boolean(instagramContent);

  const mobileIdleEmpty = isMobile && !hasAnyChannelResult && !storyBusy;
  const showMobileChrome = isMobile && (hasAnyChannelResult || storyBusy);
  const hideFormPanel =
    isMobile && !formOpen && (hasAnyChannelResult || storyBusy);
  const mobileHideResults =
    isMobile && (mobileIdleEmpty || formOpen);
  const mobilePane = formOpen ? "form" : "story";
  const storyTitle =
    blogContent?.representativeTitle || blogContent?.title || null;

  return (
    <div className="workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden max-lg:flex-col md:flex-row">
      {showMobileChrome ? (
        <MobileStoryChrome
          pane={mobilePane}
          onPaneChange={(next) => setFormOpen(next === "form")}
          storyReady={hasAnyChannelResult}
          isGenerating={storyBusy && !hasAnyChannelResult}
          storyTitle={storyTitle}
        />
      ) : null}
      <BlogEditorFormPane
        onNavigate={onNavigate}
        userId={userId}
        brandId={brandId}
        activeBrand={activeBrand}
        hideFormPanel={hideFormPanel}
        mobileIdleFull={mobileIdleEmpty}
        onStartGenerate={() => {
          if (isMobile) setFormOpen(false);
        }}
        onPlanChange={onPlanChange}
      />
      <BlogEditorResults
        onCopy={onCopy}
        onNavigate={onNavigate}
        userId={userId}
        brandId={brandId}
        activeBrand={activeBrand}
        hideFormPanel={hideFormPanel}
        mobileHidden={mobileHideResults}
        billingPlanId={billingPlanId}
      />
    </div>
  );
}
