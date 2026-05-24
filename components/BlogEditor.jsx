"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmptyStoryPanel from "@/components/product/EmptyStoryPanel";
import { EMPTY_STORY, WORKSPACE_BLOG } from "@/lib/product/craft";
import ChannelLayoutToggle from "@/components/ChannelLayoutToggle";
import StickyCopyBar from "@/components/StickyCopyBar";
import { useChannelLayoutMode } from "@/hooks/useChannelLayoutMode";
import { useViewport } from "@/hooks/useViewport";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import WorkspaceChannelIntro from "@/components/workspace/WorkspaceChannelIntro";
import BlogForm from "@/components/BlogForm";
import MobileSecondaryAccordion from "@/components/MobileSecondaryAccordion";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import UploadGuidePanel from "@/components/UploadGuidePanel";
import BlogResultView from "@/components/BlogResultView";
import BaseContentCard from "@/components/BaseContentCard";
import PipelineQuickActions from "@/components/PipelineQuickActions";
import Icon from "@/components/Icon";
import {
  useContentForm,
  useContentPipelineState,
} from "@/context/ContentContext";
import { isEmailVerified } from "@/lib/auth/emailVerification";
import { EMAIL_VERIFY } from "@/lib/product/craft";
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
  formOpen,
  setFormOpen,
  hideFormPanel,
  onPlanChange,
}) {
  const goHistory =
    typeof onNavigate === "function"
      ? () => onNavigate("history")
      : null;
  const { blogInput, setBlogInput, touched, setTouched } = useContentForm();
  const {
    blogContent,
    placeContent,
    instagramContent,
    generating,
    generateBlog,
    llmStatus,
    blogGenHint,
    memoryContentIds,
    user,
    demoMode,
    billingPlanId,
    billingBypassQuotas,
  } = useContentPipelineState();

  const { usage: billingUsage, phase: billingPhase } = useBillingUsage();
  const { simpleMode } = useSimpleWorkspaceMode(userId);
  const quotaExhausted =
    !demoMode &&
    !billingBypassQuotas &&
    isContentQuotaExhausted(billingUsage);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [blogOnly, setBlogOnly] = useState(true);
  const {
    draft: draftForm,
    setDraft: setDraftForm,
    formApiRef,
    patchDraft: patchDraftImmediate,
  } = useDeferredWorkspaceForm(blogInput, setBlogInput);
  const debouncedDraftForSave = useDebouncedValue(draftForm, 900);
  const { isMobile } = useViewport();

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
      if (isMobile) setFormOpen(false);
      generateBlog(next, { blogOnly });
    },
    [
      generateBlog,
      blogOnly,
      setTouched,
      setDraftForm,
      isMobile,
      setFormOpen,
    ]
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

  const needsEmailVerify =
    Boolean(user) && !demoMode && !isEmailVerified(user);

  const disabledReason = needsEmailVerify
    ? EMAIL_VERIFY.body
    : !generating.blog && !formValidNow
      ? draftErrors.region ||
        draftErrors.topic ||
        draftErrors.brandName ||
        "브랜드 · 지역 · 주제를 입력해 주세요"
      : null;

  return (
    <>
      {blogContent && isMobile && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EBED] bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="min-h-[40px] rounded-lg border border-[#E8EBED] px-3 py-2 text-[12px] font-semibold text-[#4E5968] hover:bg-[#F7F8FA]"
          >
            {formOpen ? "결과 보기" : "주제·설정"}
          </button>
          <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
        </div>
      )}

      <div
        className={`min-h-0 w-full shrink-0 overflow-y-auto border-[#E8EBED] bg-white max-lg:max-h-[52dvh] max-lg:border-b lg:block lg:w-[min(380px,38vw)] lg:max-w-[420px] lg:border-r ${
          hideFormPanel ? "max-lg:hidden" : ""
        }`}
      >
        <div className={`${compact ? "p-3" : "p-4"} md:p-6`}>
          <WorkspaceChannelIntro
            compact={compact}
            title={WORKSPACE_BLOG.title}
            description={
              compact ? WORKSPACE_BLOG.taglineCompact : WORKSPACE_BLOG.tagline
            }
            warning={
              !activeBrand?.brandName && !draftForm.brandName?.trim()
                ? "사이드바 「+ 브랜드 추가」 또는 아래 브랜드명을 입력해 주세요"
                : null
            }
          />

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
            !blogContent &&
            !generating.blog &&
            !needsEmailVerify && (
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

          <div
            className={`${compact ? "mt-3" : "mt-5"} ${
              generating.blog ? "pointer-events-none opacity-55" : ""
            }`}
            aria-busy={generating.blog || undefined}
          >
            {generating.blog && (
              <p className="mb-3 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 text-[12px] leading-relaxed text-[#8B95A1]">
                {WORKSPACE_BLOG.generatingNote}
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
              deferParentSync
            />
          </div>

          {!generating.blog && (
            <ChannelPackToggle
              blogOnly={blogOnly}
              compactCopy={shouldUseCompactChannelPackCopy(generationCount)}
              disabled={generating.blog}
              onChange={(only) => {
                setBlogOnly(only);
                saveBlogOnlyPref(only);
                saveChannelGenPref("blog", { blogOnly: only });
              }}
            />
          )}

          {needsEmailVerify && (
            <div
              className="mt-4 rounded-xl border border-[#03C75A]/30 bg-[#F0FFF5] px-4 py-3 text-[12px] leading-relaxed text-[#4E5968]"
              role="status"
            >
              <p className="font-semibold text-[#191F28]">{EMAIL_VERIFY.title}</p>
              <p className="mt-1">{EMAIL_VERIFY.body}</p>
            </div>
          )}

          {quotaExhausted && (
            <QuotaExhaustedCallout
              planId={billingPlanId}
              onUpgradeClick={onPlanChange}
            />
          )}

          <button
            type="button"
            disabled={
              !formValidNow ||
              generating.blog ||
              needsEmailVerify ||
              quotaExhausted
            }
            onClick={runGenerate}
            className="briclog-btn-primary mt-6 disabled:opacity-50"
          >
            {generating.blog ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  className="briclog-spinner h-4 w-4 border-white/30 border-t-white"
                  aria-hidden
                />
                <span>{WORKSPACE_BLOG.ctaBusy}</span>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Icon name="sparkles" className="h-5 w-5" />
                <span>
                  {llmStatus.llmAvailable === false
                    ? "구성안 만들기"
                    : WORKSPACE_BLOG.cta}
                </span>
              </span>
            )}
          </button>
          {!demoMode && !quotaExhausted && (
            <GenerationQuotaHint usage={billingUsage} phase={billingPhase} />
          )}
          {formValidNow && !generating.blog && !quotaExhausted && (
            <p className="mt-2 text-center text-[11px] text-[#B0B8C1]">
              {WORKSPACE_BLOG.shortcutHint}
            </p>
          )}
          {disabledReason && !generating.blog && (
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

          {blogContent && !compact && !simpleMode && (
            <PipelineQuickActions onNavigate={onNavigate} simpleMode={simpleMode} />
          )}

          {!simpleMode && (
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
  billingPlanId = "free",
}) {
  const {
    blogContent,
    placeContent,
    instagramContent,
    imagePrompts,
    baseContentLabel,
    generating,
    blogGenHint,
    blogGenHintIsAuth,
    loadingOverlay,
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
  const { isMobile, isTablet } = useViewport();
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

  const isStoryInFlight =
    generating.blog || Boolean(loadingOverlay?.active);

  return (
      <div
        className={`workspace-result-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F8FA] p-4 md:p-6 lg:p-8 ${
          showStickyCopy ? "has-sticky-copy" : ""
        } ${hideFormPanel ? "" : ""}`}
      >
        {isStoryInFlight ? (
          <GeneratingResultPlaceholder
            compact={compact}
            phase={blogContent ? "revealing" : "writing"}
            previewTitle={blogContent?.representativeTitle || null}
          />
        ) : blogContent ? (
          <>
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
                  billingPlanId={billingPlanId}
                  conciseView={concise && (isMobile || isTablet)}
                  onCopy={(text) => {
                    onCopy?.(text);
                    trackContentEvent({
                      eventType: "copy_all",
                      brandId,
                      contentItemId: memoryContentIds?.blog,
                      channel: "blog",
                    });
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
                  비주얼 프롬프트
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4E5968]">
                  {imagePrompts.activePrompt ||
                    imagePrompts.thumbnailPrompt ||
                    "프롬프트 없음"}
                </pre>
              </div>
            )}
            {resultTab === "image" && !imagePrompts && (
              <p className="text-center text-[14px] text-[#8B95A1]">
                프롬프트는 「프롬프트」 메뉴에서 따로 만듭니다.
              </p>
            )}
          </>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col justify-center py-16">
            {blogGenHint ? (
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF8E6] px-5 py-4 text-center">
                <p className="text-[14px] font-semibold text-[#191F28]">
                  이번에는 글이 나오지 않았어요
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#4E5968]">
                  {blogGenHint}
                </p>
                {!blogGenHintIsAuth ? (
                  <p className="mt-3 text-[12px] text-[#8B95A1]">
                    브랜드명 · 지역 · 주제를 확인한 뒤 왼쪽에서 다시 시도해 주세요.
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyStoryPanel
                compact={compact}
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
  const { blogContent, billingPlanId } = useContentPipelineState();
  const { isMobile } = useViewport();
  const { compact } = useWorkspaceCompact();
  const { concise } = useChannelLayoutMode("blog");
  const [formOpen, setFormOpen] = useState(true);

  useEffect(() => {
    if (blogContent && isMobile && concise) {
      setFormOpen(false);
    }
  }, [blogContent, isMobile, concise]);

  const hideFormPanel = isMobile && concise && blogContent && !formOpen;

  return (
    <div className="workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      <BlogEditorFormPane
        onNavigate={onNavigate}
        userId={userId}
        brandId={brandId}
        activeBrand={activeBrand}
        formOpen={formOpen}
        setFormOpen={setFormOpen}
        hideFormPanel={hideFormPanel}
        onPlanChange={onPlanChange}
      />
      <BlogEditorResults
        onCopy={onCopy}
        onNavigate={onNavigate}
        userId={userId}
        brandId={brandId}
        activeBrand={activeBrand}
        hideFormPanel={hideFormPanel}
        billingPlanId={billingPlanId}
      />
    </div>
  );
}
