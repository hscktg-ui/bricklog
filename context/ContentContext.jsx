"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  startTransition,
} from "react";
import { flushSync } from "react-dom";
import { estimateBlogGenerationMs } from "@/lib/loading/estimateGenerationMs";
import {
  DEFAULT_BLOG_INPUT,
  GENERATION_DELAY_MS,
  GENERATION_MIN_OVERLAY_MS,
} from "@/lib/constants";
import { unlockAudioFromUserGesture } from "@/lib/audio/briclogSounds";
import {
  getCompleteMessage,
  SENSITIVE_VERIFY_STEP,
  FEEDBACK_REWRITE_STEPS,
  PLACE_FEEDBACK_REWRITE_STEPS,
  INSTA_FEEDBACK_REWRITE_STEPS,
} from "@/lib/loading/generationSteps";
import {
  applyChannelFeedbackPatch,
  feedbackRegenSeed,
} from "@/lib/content/blogDerive";
import {
  buildFeedbackRegenDirective,
  formatFeedbackIntentBrief,
  mergeFeedbackHints,
} from "@/lib/feedback/feedbackIntentEngine";
import {
  applyFeedbackSurgicalRewrite,
  polishFeedbackRewritePack,
  shouldFeedbackFullRegen,
} from "@/lib/feedback/feedbackBlogDelivery";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { autoImproveContent } from "@/lib/editorAI/autoImprove";
import { runEditorAI, compareEditorScores } from "@/lib/editorAI";
import { learnEditorAIAction } from "@/lib/learning/brandLearning";
import { pushRewriteVersion } from "@/lib/rewrite/rewriteVersions";
import {
  loadFormDraft,
  saveFormDraft,
} from "@/lib/formDraft";
import { consumePublicTestSignupDraft } from "@/lib/publicTest/restorePublicTestSignupDraft";
import { brandMemoryToFormInput } from "@/lib/brands/brandMemory";
import {
  validateForm,
  isFormValid,
  ensureChannelGenerateInput,
} from "@/lib/formValidation";
import { isClientBetaActive } from "@/lib/billing/betaAccessClient";
import {
  generateResearchAsync,
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  runImageStandalone,
  buildFormBlogProxy,
  toGenerationRecord,
  normalizePipelineInput,
} from "@/lib/contentPipeline";
import { LLM_USER_MESSAGES, getGeminiFallbackDevHint } from "@/lib/llm/messages";
import { EDITOR_IMPROVE } from "@/lib/product/craft";
import {
  CUSTOMER_PIPELINE_STEP_LABELS,
  mapCustomerPipelineStepLabel,
} from "@/lib/product/customerOutput";
import { serializeContent } from "@/lib/contentFormat";
import { saveGeneration, saveChannelGeneration } from "@/lib/generations";
import { getPurposeModifier } from "@/lib/prompts/purposes";
import { getToneModifier } from "@/lib/prompts/tones";
import { recordGenerationSignal } from "@/lib/trends/trendIntelligence";
import {
  reapplyBlogEdits,
  reapplyPlaceEdits,
  reapplyInstaEdits,
} from "@/lib/content/reapplyPack";
import { polishChannelPackAfterPipeline } from "@/lib/content/channelRewritePolish";
import { createPromptContext } from "@/utils/promptBuilder";
import {
  extractBlogPlainText,
  checkRecentSimilarity,
} from "@/lib/duplicate/contentSimilarity";
import { learnFromEdit } from "@/lib/learning/brandLearning";
import { analyzeHumanCorrection } from "@/lib/evolution/humanCorrectionEngine";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import {
  runRewrite,
  recordRewriteLearning,
  parseFeedbackIntent,
} from "@/lib/rewrite/rewriteEngine";
import {
  persistPipelineToMemory,
  persistMemoryRewrite,
} from "@/lib/memory/persistGeneration";
import { hydrateWorkspaceFromMemory } from "@/lib/memory/hydrateWorkspaceFromMemory";
import { pipelineContentFromMemoryItem } from "@/lib/memory/contentStore";
import { trackContentEvent } from "@/lib/feedback/trackEvent";
import { canUsePipelineChannel } from "@/lib/billing/checkEntitlement";
import { getUsageWarningToast } from "@/lib/billing/planUx";
import {
  hasSeenChannelPackHint,
  markChannelPackHintSeen,
} from "@/lib/preferences/channelPackHint";
import {
  resolveDerivationSource,
  runPlaceStandalone,
  runInstagramStandalone,
  buildChannelSourceBrief,
  buildSourceLabel,
} from "@/lib/content/channelSource";
import { buildImageGenerationContext } from "@/lib/images/imagePurposeConfig";
import { applyResearchToPipeline } from "@/lib/research/applyResearchToPipeline";
import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import {
  runSignatureChannelGeneration,
  runDerivedSignatureChannel,
} from "@/lib/content/runSignatureChannelGeneration";
import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate";
import {
  formatPostVerifyUserMessage,
  resolveDeliveryFailureMessage,
} from "@/lib/product/customerOutput";
import {
  resolveBlogUiDelivery,
  salvageBlogPackForDelivery,
} from "@/lib/generation/postVerifySalvage";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import {
  GENERATION_CHANNEL_PACK_DEADLINE_MS,
  GENERATION_TIME_BUDGET_MS,
} from "@/lib/constants";
import { AUTO_RUN_PROMPT_ON_BLOG } from "@/lib/channels/channelProducts";
import { isAutoPipelineAfterBlog } from "@/lib/config/productFlags";
import { isChannelPackDeferred } from "@/lib/config/briclogFastPipeline";
import { setGenerationSessionActive } from "@/lib/generation/generationSession";
import {
  stashPendingBlogResult,
  clearPendingBlogResult,
  restorePendingBlogResult,
} from "@/lib/generation/pendingBlogRecovery";
import {
  emitBrandFormSync,
  coalesceBlogGenerationInput,
  mergeWorkspaceBrandIntoInput,
} from "@/lib/workspace/brandFormSync";
import { BACKGROUND_OPS } from "@/lib/product/craft";
import { ensureBlogDelivery, forceLocalBlogPreviewDelivery } from "@/lib/generation/ensureBlogDelivery";
import { normalizeBlogGenerationFailure } from "@/lib/generation/normalizeGenerationError";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import {
  finalizeContentQualityForDelivery,
  hasSubstantiveLlmBody,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";

function allowBlogUiRescue() {
  return true;
}

function resolveBlogGenerationFailMessage(pipelineInput, result) {
  const msg = String(result?.userMessage || "").trim();
  if (msg) return msg;
  if (!hasFilledBlogAxes(pipelineInput)) {
    return "브랜드 · 지역 · 주제를 모두 입력해 주세요.";
  }
  return "이번에는 편집본을 화면에 올리지 못했어요. 잠시 후 「조사 후 글 받기」를 다시 눌러 주세요.";
}

function missionProseFallbackForUi(pipelineInput) {
  if (!allowBlogUiRescue()) return null;
  if (!hasFilledBlogAxes(pipelineInput)) return null;
  try {
    let pack = buildMissionProseFallbackPack(pipelineInput);
    pack = applyV17PostWritePack(pack, { input: pipelineInput }, "blog");
    pack = applyHumanityFinishPass(pack, { input: pipelineInput }, "blog");
    pack = ensureBlogDisplayPack(pack, pipelineInput);
    return pack?.sections?.length ? pack : null;
  } catch {
    return null;
  }
}

const ContentContext = createContext(null);
const ContentFormContext = createContext(null);
const ContentPipelineContext = createContext(null);

const CHANNEL_UPGRADE_HINT =
  "플레이스·인스타·프롬프트는 플러스(19,900원/월)부터 이용할 수 있습니다.";

const INITIAL_GENERATING = {
  blog: false,
  place: false,
  instagram: false,
  image: false,
};

const SHARED_CHANNEL_OPTION_KEYS = [
  "brandName",
  "brandType",
  "industry",
  "region",
  "topic",
  "mainKeyword",
  "subKeyword",
  "purpose",
  "tone",
  "contentObjective",
  "speechStyle",
  "contentPersona",
  "contentPersonaSubtype",
  "blogLengthTier",
];

/** 플레이스·인스타 피드백 재생성 — LLM 이야기 없이도 타 채널 초안으로 연계 */
function resolveBlogLikeForRewrite(targetChannel, state) {
  const {
    blogContent,
    placeContent,
    instagramContent,
    blogInput,
    baseContentLabel,
    sourceChannel,
  } = state;
  const isLlmBlog =
    blogContent &&
    !blogContent._meta?.isBriefOnly &&
    (blogContent._meta?.generationMode === "llm" ||
      String(blogContent._meta?.generationMode || "").startsWith("llm_"));
  if (isLlmBlog) {
    return {
      blogLike: blogContent,
      baseLabel: baseContentLabel,
    };
  }
  const src = resolveDerivationSource(targetChannel, {
    blogContent,
    placeContent,
    instagramContent,
    blogInput,
    baseContentLabel,
    sourceChannel,
  });
  if (src?.blogLike) {
    return {
      blogLike: src.blogLike,
      baseLabel: src.baseLabel || baseContentLabel,
    };
  }
  return null;
}

export function ContentProvider({
  children,
  user,
  demoMode = false,
  billingPlanId = "free",
  billingBypassQuotas = false,
  onToast,
  brandHooks = null,
}) {
  const [blogInput, setBlogInput] = useState(DEFAULT_BLOG_INPUT);
  const [blogContent, setBlogContent] = useState(null);
  const [placeContent, setPlaceContent] = useState(null);
  const [instagramContent, setInstagramContent] = useState(null);
  const [imagePrompts, setImagePrompts] = useState(null);
  const [baseContentLabel, setBaseContentLabel] = useState(null);
  const [sourceChannel, setSourceChannel] = useState(null);
  const [instaTone, setInstaTone] = useState("emotional");
  const [imageOptions, setImageOptions] = useState({
    purpose: "thumbnail",
    ratio: "1:1",
    tone: "white",
    imageKpi: "ctr",
    provider: "auto",
  });
  const [generating, setGenerating] = useState(INITIAL_GENERATING);
  const [channelOptionLockStatus, setChannelOptionLockStatus] = useState(null);
  const blogGenLock = useRef(false);
  const channelUpgradeHintShown = useRef(false);
  const hydratedBrandRef = useRef(null);

  const allowPipelineChannel = useCallback(
    (channel) =>
      demoMode ||
      billingBypassQuotas ||
      isClientBetaActive() ||
      canUsePipelineChannel(billingPlanId, channel),
    [demoMode, billingPlanId, billingBypassQuotas]
  );

  const maybeChannelUpgradeHint = useCallback(() => {
    if (demoMode || billingPlanId !== "free") return;
    if (channelUpgradeHintShown.current) return;
    channelUpgradeHintShown.current = true;
    onToast?.(CHANNEL_UPGRADE_HINT, "info");
  }, [demoMode, billingPlanId, onToast]);
  const [memoryContentIds, setMemoryContentIds] = useState({
    blog: null,
    place: null,
    instagram: null,
  });
  const [loadingOverlay, setLoadingOverlay] = useState({
    active: false,
    channel: "blog",
    complete: false,
    stepLabel: null,
    startedAt: null,
    estimatedMs: null,
    sensitiveIndustry: false,
    completeMessage: null,
    peekResults: false,
    quietSuccess: false,
  });
  const [editorImproving, setEditorImproving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [signupDraftRestored, setSignupDraftRestored] = useState(false);
  const deferredBlogInput = useDeferredValue(blogInput);
  const [llmStatus, setLlmStatus] = useState({
    llmAvailable: null,
    mode: null,
    operatorHint: null,
  });
  const [blogGenHint, setBlogGenHint] = useState(null);
  const [blogGenHintIsAuth, setBlogGenHintIsAuth] = useState(false);
  const [blogGenHintSoft, setBlogGenHintSoft] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [blogResultRevealPending, setBlogResultRevealPending] = useState(false);
  const personalizationRef = useRef(null);
  const overlayFinishTimers = useRef([]);

  const clearOverlayFinishTimers = useCallback(() => {
    overlayFinishTimers.current.forEach((id) => clearTimeout(id));
    overlayFinishTimers.current = [];
  }, []);

  const dismissLoadingOverlay = useCallback(() => {
    clearOverlayFinishTimers();
    blogGenLock.current = false;
    setGenerationSessionActive(false);
    setGenerating(INITIAL_GENERATING);
    setBlogResultRevealPending(false);
    setLoadingOverlay({
      active: false,
      channel: "blog",
      complete: false,
      stepLabel: null,
      startedAt: null,
      estimatedMs: null,
      sensitiveIndustry: false,
      completeMessage: null,
      peekResults: false,
      quietSuccess: false,
    });
  }, [clearOverlayFinishTimers]);

  useEffect(() => {
    window.addEventListener("briclog-dismiss-loading-overlay", dismissLoadingOverlay);
    return () =>
      window.removeEventListener(
        "briclog-dismiss-loading-overlay",
        dismissLoadingOverlay
      );
  }, [dismissLoadingOverlay]);

  useEffect(() => {
    if (!user?.id) return;
    dismissLoadingOverlay();
  }, [user?.id, dismissLoadingOverlay]);

  useEffect(() => {
    if (!user?.id || blogContent) return;
    const restored = restorePendingBlogResult(user.id);
    if (!restored?.blog) return;
    setBlogContent(restored.blog);
    if (restored.baseContentLabel) {
      setBaseContentLabel(restored.baseContentLabel);
    }
    if (restored.sourceChannel) {
      setSourceChannel(restored.sourceChannel);
    }
    clearPendingBlogResult();
    onToast?.("방금 작성한 이야기를 복구해 표시했습니다.", "info");
  }, [user?.id, blogContent, onToast]);

  const acknowledgeBlogResultDisplayed = useCallback(() => {
    setBlogResultRevealPending(false);
    setGenerating((g) => ({ ...g, blog: false }));
    setGenerationSessionActive(false);
    blogGenLock.current = false;
    clearPendingBlogResult();
  }, []);

  useEffect(() => {
    if (!blogResultRevealPending || !blogContent) return undefined;
    const id = window.setTimeout(() => acknowledgeBlogResultDisplayed(), 5000);
    return () => window.clearTimeout(id);
  }, [blogResultRevealPending, blogContent, acknowledgeBlogResultDisplayed]);

  useEffect(() => {
    if (!loadingOverlay.active) return undefined;
    const est = loadingOverlay.estimatedMs || GENERATION_TIME_BUDGET_MS;
    const warnAt = est + 45_000;
    const warnId = window.setTimeout(() => {
      setLoadingOverlay((prev) =>
        prev.active && !prev.complete
          ? {
              ...prev,
              stepLabel:
                "조금 더 걸리고 있어요. 이 화면을 유지한 채 기다려 주세요.",
            }
          : prev
      );
    }, warnAt);
    return () => window.clearTimeout(warnId);
  }, [loadingOverlay.active, loadingOverlay.estimatedMs]);

  useEffect(() => {
    fetch("/api/content/status")
      .then((r) => r.json())
      .then((data) =>
        setLlmStatus({
          llmAvailable: !!data.llmAvailable,
          mode: data.mode,
          operatorHint: data.operatorHint,
        })
      )
      .catch(() =>
        setLlmStatus({
          llmAvailable: false,
          mode: "brief_only",
          operatorHint: null,
        })
      );
  }, []);

  const finishLoadingOverlay = useCallback(
    (
      channel,
      startedAt,
      {
        success = true,
        message,
        immediate = false,
        hintIsAuth = false,
        hintSoft = undefined,
        quietSuccess = false,
        revealSuccess = false,
        revealMs = 450,
        completeMessage = null,
        toastType = "success",
      } = {}
    ) => {
      clearOverlayFinishTimers();
      if (channel === "blog" || channel === "pipeline") {
        if (success) {
          setBlogGenHint(null);
          setBlogGenHintIsAuth(false);
          setBlogGenHintSoft(false);
        } else {
          setBlogGenHint(message || null);
          if (typeof hintSoft === "boolean") {
            setBlogGenHintSoft(hintSoft);
          }
          setBlogGenHintIsAuth(
            hintIsAuth ||
              (Boolean(message) &&
                /로그인|인증|세션|한도/.test(String(message)))
          );
        }
      }
      if (!success) {
        dismissLoadingOverlay();
        if (message) onToast?.(message, toastType === "error" ? "error" : "info");
        return;
      }
      if (revealSuccess) {
        setLoadingOverlay((prev) => ({
          active: true,
          channel,
          complete: true,
          stepLabel: null,
          startedAt: prev.startedAt,
          estimatedMs: null,
          sensitiveIndustry: false,
          completeMessage: completeMessage || "이야기가 준비됐어요",
          peekResults: true,
          quietSuccess,
        }));
        const tDismiss = window.setTimeout(() => {
          setLoadingOverlay({
            active: false,
            channel,
            complete: false,
            stepLabel: null,
            startedAt: null,
            estimatedMs: null,
            sensitiveIndustry: false,
            completeMessage: null,
            peekResults: false,
            quietSuccess: false,
          });
          if (channel === "blog" || channel === "pipeline") {
            const tReveal = window.setTimeout(
              () => setBlogResultRevealPending(false),
              520
            );
            overlayFinishTimers.current.push(tReveal);
          }
        }, revealMs);
        overlayFinishTimers.current.push(tDismiss);
        if (!quietSuccess) {
          if (message) onToast?.(message, "success");
          else onToast?.(getCompleteMessage(channel), "success");
        }
        return;
      }
      if (immediate || quietSuccess) {
        setLoadingOverlay({
          active: false,
          channel,
          complete: false,
          stepLabel: null,
          startedAt: null,
          estimatedMs: null,
          sensitiveIndustry: false,
          completeMessage: null,
          peekResults: false,
          quietSuccess: false,
        });
        return;
      }
      const wait = Math.max(
        0,
        GENERATION_MIN_OVERLAY_MS - (Date.now() - startedAt)
      );
      const t1 = window.setTimeout(() => {
        setLoadingOverlay({ active: true, channel, complete: true });
        if (message) {
          onToast?.(message, "success");
        } else {
          onToast?.(getCompleteMessage(channel), "success");
        }
        const t2 = window.setTimeout(
          () =>
            setLoadingOverlay({
              active: false,
              channel,
              complete: false,
              stepLabel: null,
              startedAt: null,
              estimatedMs: null,
              sensitiveIndustry: false,
              completeMessage: null,
              peekResults: false,
              quietSuccess: false,
            }),
          1000
        );
        overlayFinishTimers.current.push(t2);
      }, wait);
      overlayFinishTimers.current.push(t1);
    },
    [onToast, dismissLoadingOverlay, clearOverlayFinishTimers]
  );

  useEffect(() => {
    const draft = loadFormDraft(user?.id);
    const publicDraft = consumePublicTestSignupDraft();
    const today = new Date().toISOString().slice(0, 10);
    if (draft || publicDraft) {
      const merged = {
        ...DEFAULT_BLOG_INPUT,
        ...draft,
        contentDate: draft?.contentDate || today,
      };
      if (publicDraft) {
        setSignupDraftRestored(true);
        if (!merged.brandName?.trim() && publicDraft.brandName) {
          merged.brandName = publicDraft.brandName;
        }
        if (!merged.region?.trim() && publicDraft.region) {
          merged.region = publicDraft.region;
        }
        if (!merged.topic?.trim() && publicDraft.topic) {
          merged.topic = publicDraft.topic;
        }
        if (!merged.mainKeyword?.trim() && publicDraft.topic) {
          merged.mainKeyword = publicDraft.topic;
        }
      }
      setBlogInput(merged);
      emitBrandFormSync(merged);
    } else {
      setBlogInput((prev) => {
        const next = {
          ...prev,
          contentDate: prev.contentDate || today,
        };
        emitBrandFormSync(next);
        return next;
      });
    }
  }, [user?.id]);

  useEffect(() => {
    const brand = brandHooks?.activeBrand;
    const brandId = brandHooks?.activeBrandId;
    if (!brand?.brandName?.trim() || !brandId) return;
    setBlogInput((prev) => {
      const seeded = brandMemoryToFormInput(brand);
      const merged = {
        ...seeded,
        ...prev,
        brandId,
        brandName: prev.brandName?.trim() || brand.brandName?.trim() || seeded.brandName,
        region: prev.region?.trim() || seeded.region || brand.region,
        industry: prev.industry?.trim() || seeded.industry,
        topic: prev.topic?.trim() || seeded.topic,
        mainKeyword: prev.mainKeyword?.trim() || seeded.mainKeyword,
        subKeyword: prev.subKeyword?.trim() || seeded.subKeyword,
        excludePhrases: prev.excludePhrases?.trim()
          ? prev.excludePhrases
          : seeded.excludePhrases,
      };
      const ensured = ensureChannelGenerateInput(merged, brand);
      if (
        ensured.values.brandName === prev.brandName &&
        ensured.values.region === prev.region &&
        ensured.values.brandId === prev.brandId
      ) {
        return prev;
      }
      queueMicrotask(() => emitBrandFormSync(ensured.values));
      return ensured.values;
    });
  }, [
    brandHooks?.activeBrandId,
    brandHooks?.activeBrand?.brandName,
    brandHooks?.activeBrand?.region,
  ]);

  useEffect(() => {
    const brandId = brandHooks?.activeBrandId;
    if (demoMode || !user?.id || !brandId) return undefined;
    if (hydratedBrandRef.current === brandId) return undefined;
    hydratedBrandRef.current = brandId;

    let cancelled = false;
    const pending = restorePendingBlogResult(user.id);

    if (pending?.blog) {
      setBlogContent(pending.blog);
      if (pending.baseContentLabel) setBaseContentLabel(pending.baseContentLabel);
      if (pending.sourceChannel) setSourceChannel(pending.sourceChannel);
    } else {
      setBlogContent(null);
    }
    setPlaceContent(null);
    setInstagramContent(null);
    setMemoryContentIds({ blog: null, place: null, instagram: null });

    void (async () => {
      try {
        const hydrated = await hydrateWorkspaceFromMemory(brandId);
        if (cancelled) return;
        setMemoryContentIds((prev) => ({ ...prev, ...hydrated.memoryContentIds }));
        if (!pending?.blog && hydrated.contents.blog) {
          setBlogContent(hydrated.contents.blog);
        }
        if (hydrated.contents.place) setPlaceContent(hydrated.contents.place);
        if (hydrated.contents.instagram) {
          setInstagramContent(hydrated.contents.instagram);
        }
      } catch {
        /* memory tables optional until schema applied */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [demoMode, user?.id, brandHooks?.activeBrandId]);

  const hasBlog = !!blogContent;
  const hasChannelPack =
    !!blogContent || !!placeContent || !!instagramContent;
  const isBusy = generating.blog || generating.place || generating.instagram || generating.image;

  const hasFullBlog =
    !!blogContent &&
    !blogContent._meta?.isBriefOnly &&
    (() => {
      const m = blogContent._meta?.generationMode || "";
      return m === "llm" || m.startsWith("llm_");
    })();

  const formReady = useMemo(() => isFormValid(blogInput), [blogInput]);
  const formErrors = useMemo(
    () => (touched ? validateForm(deferredBlogInput) : {}),
    [touched, deferredBlogInput]
  );
  const channelStartReady = useMemo(
    () =>
      ensureChannelGenerateInput(deferredBlogInput, brandHooks?.activeBrand).ok,
    [
      deferredBlogInput,
      brandHooks?.activeBrandId,
      brandHooks?.activeBrand?.brandName,
    ]
  );
  const hasOtherDraft = Boolean(
    placeContent || instagramContent || (blogContent && !hasFullBlog)
  );

  const pipelineReady = useMemo(
    () => ({
      place:
        !generating.blog &&
        (channelStartReady ||
          hasFullBlog ||
          formReady ||
          !!placeContent ||
          !!instagramContent),
      instagram:
        !generating.blog &&
        (channelStartReady ||
          hasFullBlog ||
          formReady ||
          !!placeContent ||
          !!instagramContent),
      image:
        !generating.blog &&
        (channelStartReady ||
          hasFullBlog ||
          !!placeContent ||
          !!instagramContent ||
          formReady),
    }),
    [
      hasFullBlog,
      formReady,
      channelStartReady,
      placeContent,
      instagramContent,
      generating.blog,
    ]
  );

  const clearDerived = useCallback(() => {
    setPlaceContent(null);
    setInstagramContent(null);
    setImagePrompts(null);
    setChannelOptionLockStatus(null);
  }, []);

  const resetToHome = useCallback(() => {
    setBlogResultRevealPending(false);
    clearPendingBlogResult();
    setBlogContent(null);
    setBaseContentLabel(null);
    setSourceChannel(null);
    setResearchResult(null);
    clearDerived();
    setTouched(false);
    setGenerating(INITIAL_GENERATING);
  }, [clearDerived]);

  const getPipelineCtx = useCallback(() => {
    const input = normalizePipelineInput({
      ...blogInput,
      brandMemory: brandHooks?.activeBrand,
      brandId: brandHooks?.activeBrandId,
    });
    return createPromptContext(input);
  }, [blogInput, brandHooks]);

  const updateBlogContent = useCallback(
    (draft) => {
      const ctx = getPipelineCtx();
      const enriched = reapplyBlogEdits(draft, { ...ctx, main: blogInput.mainKeyword }, blogInput);
      setBlogContent(enriched);
    },
    [blogInput, getPipelineCtx]
  );

  const updatePlaceContent = useCallback(
    (draft) => {
      const ctx = getPipelineCtx();
      setPlaceContent(reapplyPlaceEdits(draft, ctx, blogInput));
    },
    [blogInput, getPipelineCtx]
  );

  const updateInstagramContent = useCallback(
    (draft) => {
      const ctx = getPipelineCtx();
      setInstagramContent(reapplyInstaEdits(draft, ctx, blogInput));
    },
    [blogInput, getPipelineCtx]
  );

  const buildMemMeta = useCallback(
    (content, extra = {}) => {
      const inp = normalizePipelineInput(blogInput);
      return {
        promptInput: inp,
        persona: inp.persona || inp.v4Speaker,
        emotionTone: inp.emotionTone || inp.emotionTemperature,
        writingTone: inp.tone,
        skillLevel: inp.skillLevel,
        qualityScore: content?._meta?.qualityScore?.total,
        failReasons: content?._meta?.failures,
        rewriteCount: content?._meta?.rewriteCount,
        generationMode: content?._meta?.generationMode,
        ...extra,
      };
    },
    [blogInput]
  );

  const saveEditedBlog = useCallback(() => {
    if (!blogContent) return;
    const plain = extractBlogPlainText(blogContent);
    const before = blogContent._initialPlain || plain;
    if (brandHooks?.activeBrandId) {
      const learned = learnFromEdit(
        brandHooks.activeBrandId,
        "blog",
        before,
        plain
      );
      if (learned) brandHooks?.updateActiveBrand?.(learned);
    }
    brandHooks?.onChannelSaved?.("blog", blogContent, plain);
    const edited = before !== plain;
    trackContentEvent({
      eventType: edited ? "human_edit" : "save",
      brandId: brandHooks?.activeBrandId,
      contentItemId: memoryContentIds.blog,
      channel: "blog",
      meta: edited ? { beforePlain: before, afterPlain: plain } : {},
    });
    if (edited) {
      const correction = analyzeHumanCorrection(before, plain);
      if (correction.changed) {
        onToast?.("수정 내용을 다음 글쓰기에 반영합니다.", "success");
      } else {
        onToast?.("검수본이 저장되었습니다.", "success");
      }
    } else {
      onToast?.("검수본이 저장되었습니다.", "success");
    }
  }, [blogContent, brandHooks, onToast, memoryContentIds.blog]);

  const saveEditedPlace = useCallback(() => {
    if (!placeContent) return;
    const plain = [placeContent.title, placeContent.shortNotice, placeContent.detailBody].join("\n");
    const before = placeContent._initialPlain || plain;
    if (brandHooks?.activeBrandId) {
      const learned = learnFromEdit(
        brandHooks.activeBrandId,
        "place",
        before,
        plain
      );
      if (learned) brandHooks?.updateActiveBrand?.(learned);
    }
    brandHooks?.onChannelSaved?.("place", placeContent, plain);
    onToast?.("플레이스 검수본 저장", "success");
  }, [placeContent, brandHooks, onToast]);

  const saveEditedInstagram = useCallback(() => {
    if (!instagramContent) return;
    const plain = instagramContent.lineBreakBody || instagramContent.body;
    const before = instagramContent._initialPlain || plain;
    if (brandHooks?.activeBrandId) {
      const learned = learnFromEdit(
        brandHooks.activeBrandId,
        "instagram",
        before,
        plain
      );
      if (learned) brandHooks?.updateActiveBrand?.(learned);
    }
    brandHooks?.onChannelSaved?.("insta", instagramContent, plain);
    onToast?.("인스타 검수본 저장", "success");
  }, [instagramContent, brandHooks, onToast]);

  const requireEmailVerified = useCallback(() => Boolean(user), [user]);

  const generateBlog = useCallback((inputOverride, genOpts = {}) => {
    if (blogGenLock.current || generating.blog) {
      onToast?.("이미 생성 중입니다. 잠시만 기다려 주세요.", "info");
      return;
    }
    if (!requireEmailVerified({ setHint: true })) return;
    let input = mergeWorkspaceBrandIntoInput(
      inputOverride
        ? coalesceBlogGenerationInput(
            { ...DEFAULT_BLOG_INPUT, ...blogInput },
            inputOverride
          )
        : blogInput,
      brandHooks
    );
    const errors = validateForm(input);
    if (Object.keys(errors).length > 0) {
      onToast?.(errors[Object.values(errors)[0]], "error");
      return;
    }
    if (input.researchEnabled && !String(input.researchQuery || "").trim()) {
      const fallbackResearchQuery = [
        input.brandName,
        input.topic || input.mainKeyword,
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" ");
      if (!fallbackResearchQuery) {
        onToast?.("자료조사를 켠 경우 연구 주제를 입력해 주세요.", "error");
        return;
      }
      input = {
        ...input,
        researchQuery: fallbackResearchQuery,
      };
    }

    const runChannelPack =
      genOpts.blogOnly === false ||
      (genOpts.blogOnly !== true && isAutoPipelineAfterBlog());

    blogGenLock.current = true;
    setBlogGenHint(null);
    setBlogGenHintIsAuth(false);
    setBlogResultRevealPending(false);
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    const overlayChannel = runChannelPack ? "pipeline" : "blog";
    const estimatedMs = estimateBlogGenerationMs(input, {
      blogOnly: !runChannelPack,
      withDefaultResearch: true,
    });
    const blogOnScreenRef = { current: false };
    const setPipelineStep = (stepLabel) =>
      setLoadingOverlay((prev) => ({
        ...prev,
        active: true,
        channel: overlayChannel,
        complete: false,
        stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        startedAt: prev.startedAt ?? startedAt,
        estimatedMs: prev.estimatedMs ?? estimatedMs,
        sensitiveIndustry: prev.sensitiveIndustry ?? false,
        peekResults: blogOnScreenRef.current,
        quietSuccess: false,
      }));

    flushSync(() => {
      setBlogContent(null);
      setBlogResultRevealPending(false);
      setLoadingOverlay({
        active: true,
        channel: overlayChannel,
        complete: false,
        stepLabel: CUSTOMER_PIPELINE_STEP_LABELS.research,
        startedAt,
        estimatedMs,
        sensitiveIndustry: false,
      });
      setGenerating((g) => ({ ...g, blog: true }));
    });

    const topicMain =
      input.topic?.trim()?.split(/[,，]/)[0]?.trim() ||
      input.mainKeyword?.trim() ||
      "";
    const runGeneration = async () => {
    const syncBrand = brandHooks?.resolveBrandFromFormSync?.(input) ?? null;
    const provisional =
      syncBrand ||
      brandHooks?.buildProvisionalBrandFromForm?.(input) ||
      brandHooks?.activeBrand ||
      null;
    const needsBrandCreate =
      Boolean(input.brandName?.trim()) && !syncBrand;
    const brandEnsureTask =
      needsBrandCreate && brandHooks?.ensureBrandFromForm
        ? brandHooks.ensureBrandFromForm(input).catch((brandErr) => {
            onToast?.(
              brandErr?.message ||
                "브랜드 연결에 실패했습니다. 입력값으로 글 생성을 계속합니다.",
              "info"
            );
            return null;
          })
        : Promise.resolve(syncBrand);

    const pipelineInput = {
      ...input,
      topic: input.topic?.trim() || topicMain,
      mainKeyword: topicMain || input.mainKeyword,
      brandMemory: provisional,
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
      brandId:
        syncBrand?.id ||
        brandHooks?.activeBrandId ||
        input.brandId ||
        provisional?.id,
    };
      const blogDerive = resolveDerivationSource("blog", {
        blogContent,
        placeContent,
        instagramContent,
        blogInput: input,
        baseContentLabel,
        sourceChannel,
      });
      if (blogDerive?.deriveBlog) {
        pipelineInput.channelSourceBrief = buildChannelSourceBrief(blogDerive);
        pipelineInput.sourceChannel = blogDerive.sourceChannel;
      }
      let overlaySuccess = false;
      let isFullBlog = false;
      let researchStorage = null;
      try {
        if (blogDerive?.deriveBlog && blogContent?._meta?.writtenFromVerifiedResearch) {
          pipelineInput.channelDeriveExempt = true;
          pipelineInput.v2PreWriteVerified = true;
          pipelineInput.v3PreWriteVerified = true;
          pipelineInput.v2ResearchReady = true;
        } else {
          const axis = await applyV2AxisResearch({
            pipelineInput,
            generateResearchAsync,
            setResearchResult,
            onStep: setPipelineStep,
          });
          if (!axis.ok) {
            blogGenLock.current = false;
            setGenerationSessionActive(false);
            setGenerating((g) => ({ ...g, blog: false }));
            setResearchResult(null);
            setBlogGenHint(axis.userMessage);
            setBlogGenHintSoft(hasFilledBlogAxes(pipelineInput));
            finishLoadingOverlay("blog", startedAt, {
              success: false,
              message: axis.userMessage,
              hintSoft: hasFilledBlogAxes(pipelineInput),
              toastType: "info",
            });
            return;
          }
          researchStorage = axis.storage;
          pipelineInput.v2AxisVerified = true;
          pipelineInput.v2ResearchReady = true;
          const geminiHint = getGeminiFallbackDevHint(
            pipelineInput.geminiResearchFallback
          );
          if (geminiHint) {
            console.info("[BRICLOG]", geminiHint);
            onToast?.(geminiHint, "info");
          }
        }

        setPipelineStep("콘텐츠 작성 중…");
        const sensitive = resolveSensitiveCompliance(pipelineInput);
        if (sensitive.isSensitive) {
        setLoadingOverlay((prev) => ({
          active: true,
          channel: "blog",
          complete: false,
          stepLabel: null,
          startedAt: prev.startedAt ?? startedAt,
          sensitiveIndustry: true,
        }));
        }
        let [result, ensuredBrand] = await Promise.all([
          ensureBlogDelivery(pipelineInput, {
            setPipelineStep,
            onRetry: () => setPipelineStep("다시 이어서 쓰는 중…"),
          }),
          brandEnsureTask,
        ]);
        if (ensuredBrand?.id) {
          pipelineInput.brandId = ensuredBrand.id;
          pipelineInput.brandMemory = ensuredBrand;
        }
        if (result.blogContent) {
          setPipelineStep("최종 검수 중…");
        }
        if (result.personalization) {
          personalizationRef.current = result.personalization;
        }
        if (sensitive.isSensitive) {
          setPipelineStep(SENSITIVE_VERIFY_STEP.text);
        }
        if (
          result.blogContent?.sections?.length &&
          (result.ok === false || result.withheld) &&
          isLlmOriginatedPack(result.blogContent, result) &&
          hasSubstantiveLlmBody(result.blogContent)
        ) {
          const polished = finalizeContentQualityForDelivery(
            result.blogContent,
            pipelineInput,
            "blog"
          );
          if (polished?.sections?.length) {
            result = {
              ...result,
              ok: true,
              withheld: false,
              userMessage: null,
              blogContent: polished,
            };
          }
        }
        if (result.ok === false && !result.blogContent) {
          const rescued = allowBlogUiRescue()
            ? forceLocalBlogPreviewDelivery(pipelineInput, result) ||
              (() => {
                const pack = missionProseFallbackForUi(pipelineInput);
                return pack
                  ? { ok: true, blogContent: pack, withheld: false, softPass: true }
                  : null;
              })()
            : null;
          if (rescued?.blogContent?.sections?.length) {
            result = rescued;
          } else {
            const failMsg = resolveBlogGenerationFailMessage(
              pipelineInput,
              result
            );
            setBlogGenHint(failMsg);
            setBlogGenHintSoft(
              hasFilledBlogAxes(pipelineInput) || Boolean(result.userMessage)
            );
            finishLoadingOverlay("blog", startedAt, {
              success: false,
              message: failMsg,
              toastType: "info",
            });
            return;
          }
        }

        let blog = result.blogContent;
        if (!blog?.sections?.length) {
          const retry = await ensureBlogDelivery(pipelineInput, {
            setPipelineStep,
            onRetry: () => setPipelineStep("글을 화면에 준비하는 중…"),
          });
          blog = retry.blogContent;
        }
        if (!blog?.sections?.length) {
          const rescued = allowBlogUiRescue()
            ? forceLocalBlogPreviewDelivery(pipelineInput, result) ||
              (() => {
                const pack = missionProseFallbackForUi(pipelineInput);
                return pack
                  ? { ok: true, blogContent: pack, withheld: false, softPass: true }
                  : null;
              })()
            : null;
          if (rescued?.blogContent?.sections?.length) {
            result = rescued;
            blog = rescued.blogContent;
          } else {
            const failMsg = resolveBlogGenerationFailMessage(
              pipelineInput,
              result
            );
            setBlogGenHint(failMsg);
            setBlogGenHintSoft(
              hasFilledBlogAxes(pipelineInput) || Boolean(result.userMessage)
            );
            finishLoadingOverlay("blog", startedAt, {
              success: false,
              message: failMsg,
              toastType: "info",
            });
            return;
          }
        }

        const archive =
          ensuredBrand?.contentArchive?.blog ||
          brandHooks?.activeBrand?.contentArchive?.blog ||
          [];
        const similarity = checkRecentSimilarity(
          extractBlogPlainText(blog),
          archive
        );
        blog = {
          ...blog,
          _meta: {
            ...blog._meta,
            similarity,
            generationMode: result.meta?.generationMode || result.mode,
            llmAvailable: result.llmAvailable,
            softPass: result.softPass || result.meta?.softPass,
            passOutput: result.meta?.passOutput,
            humanityScore:
              blog._meta?.humanityScore ?? result.meta?.qualityScore,
            searchIntentScore: blog._meta?.searchIntentScore,
            qualityHint: blog._meta?.qualityHint,
            v4Background: blog._meta?.v4Background,
            rewriteCount:
              blog._meta?.rewriteCount ?? result.meta?.rewriteCount,
            failReasons:
              blog._meta?.failReasons ?? result.meta?.failReasons,
            improvementSuggestions:
              blog._meta?.improvementSuggestions ??
              result.meta?.improvementSuggestions,
          },
        };
        blog._initialPlain = extractBlogPlainText(blog);
        isFullBlog =
          result.mode === "llm" &&
          (Boolean(result.meta?.v2PipelineVerified) ||
            Boolean(result.meta?.v3PipelineVerified) ||
            blog._meta?.writtenFromVerifiedResearch) &&
          !blog._meta?.isBriefOnly &&
          !blog._meta?.draftFallback;

        const deliverBlogResult = () => {
          let delivery = resolveBlogUiDelivery(blog, pipelineInput, result);
          if (
            !delivery.ok &&
            blog?.sections?.length &&
            isLlmOriginatedPack(blog, result)
          ) {
            const polished = finalizeContentQualityForDelivery(
              ensureBlogDisplayPack(blog, pipelineInput),
              pipelineInput,
              "blog"
            );
            if (polished?.sections?.length) {
              delivery = {
                ok: true,
                pack: polished,
                preview: false,
                userMessage: null,
                gate: delivery.gate,
              };
            }
          }
          if (
            !delivery.ok &&
            allowBlogUiRescue() &&
            blog?.sections?.length &&
            !isLlmOriginatedPack(blog, result)
          ) {
            const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
            delivery = resolveBlogUiDelivery(salvaged, pipelineInput, {
              ...result,
              withheld: false,
              softPass: true,
            });
          }
          if (!delivery.ok && allowBlogUiRescue()) {
            if (blog?.sections?.length && hasFilledBlogAxes(pipelineInput)) {
              const forced = ensureBlogDisplayPack(
                salvageBlogPackForDelivery(blog, pipelineInput),
                pipelineInput
              );
              if (forced?.sections?.length) {
                delivery = {
                  ok: true,
                  pack: {
                    ...forced,
                    _meta: {
                      ...(forced._meta || {}),
                      deliveryPreview: false,
                      passOutput: true,
                      softPass: false,
                      completeDraft: true,
                      displayReady: true,
                    },
                  },
                  preview: false,
                  userMessage: null,
                };
              }
            }
          }
          if (!delivery.ok && allowBlogUiRescue()) {
            const fallbackPack = missionProseFallbackForUi(pipelineInput);
            if (fallbackPack) {
              delivery = {
                ok: true,
                pack: {
                  ...fallbackPack,
                  _meta: {
                    ...(fallbackPack._meta || {}),
                    deliveryPreview: false,
                    passOutput: true,
                    softPass: false,
                    completeDraft: true,
                    displayReady: true,
                    missionFallbackUi: true,
                  },
                },
                preview: true,
                userMessage: null,
              };
            } else {
              const failMsg =
                delivery.userMessage ||
                resolveDeliveryFailureMessage(delivery.gate || {}) ||
                resolveBlogGenerationFailMessage(pipelineInput, result);
              setBlogGenHint(failMsg);
              setBlogGenHintSoft(true);
              setGenerating((g) => ({ ...g, blog: false }));
              finishLoadingOverlay(overlayChannel, startedAt, {
                success: false,
                message: failMsg,
                toastType: "info",
              });
              return false;
            }
          }
          const packForUi = delivery.pack;
          const nextSource =
            blogDerive?.sourceChannel && blogDerive.sourceChannel !== "blog"
              ? blogDerive.sourceChannel
              : "blog";
          stashPendingBlogResult(user?.id, {
            blog: packForUi,
            baseContentLabel: result.baseContentLabel,
            sourceChannel: nextSource,
          });
          flushSync(() => {
            setBlogContent(packForUi);
            setBaseContentLabel(result.baseContentLabel);
            setSourceChannel(nextSource);
            clearDerived();
            setBlogGenHint(null);
            setBlogGenHintSoft(false);
            setBlogGenHintIsAuth(false);
            setBlogResultRevealPending(false);
            setGenerating((g) => ({ ...g, blog: false }));
          });
          blogOnScreenRef.current = true;
          overlaySuccess = true;
          if (runChannelPack) {
            finishLoadingOverlay(overlayChannel, startedAt, {
              success: true,
              revealSuccess: true,
              peekResults: true,
              quietSuccess: true,
              revealMs: 420,
              completeMessage:
                isChannelPackDeferred()
                  ? "블로그 편집본이 준비됐어요. 플레이스·인스타는 백그라운드에서 맞추는 중…"
                  : "블로그 편집본이 준비됐어요. 플레이스·인스타를 맞추는 중…",
            });
          } else {
            finishLoadingOverlay(overlayChannel, startedAt, {
              success: true,
              immediate: true,
              quietSuccess: true,
            });
          }
          if (delivery.preview && delivery.userMessage) {
            onToast?.(delivery.userMessage, "info");
          }
          return true;
        };

        const blogDelivered = deliverBlogResult();
        if (!blogDelivered) {
          blogGenLock.current = false;
          setGenerationSessionActive(false);
          setGenerating((g) => ({ ...g, blog: false }));
          dismissLoadingOverlay();
          return;
        }

        if (result.usageWarning) {
          const warnMsg = getUsageWarningToast(
            billingPlanId,
            result.usage || { usageWarning: true, planId: billingPlanId }
          );
          if (warnMsg) onToast?.(warnMsg, "info");
        }

        if (
          !demoMode &&
          isFullBlog &&
          !runChannelPack &&
          !hasSeenChannelPackHint()
        ) {
          markChannelPackHintSeen();
          onToast?.(
            "같은 조사 결과로 플레이스·인스타 편집본도 받을 수 있어요. 왼쪽 「플레이스·인스타도 함께」를 켜 보세요.",
            "info"
          );
        }

        if (result.mode === "llm" && result.meta?.passOutput) {
          brandHooks?.onChannelSaved?.("blog", blog);
          recordGenerationSignal(brandHooks?.activeBrandId, "blog", {
            opener: blog?.sections?.[0]?.body?.slice(0, 60),
          });
        }

        const runPostBlogTail = async () => {
          if (
            runChannelPack &&
            !isChannelPackDeferred() &&
            Date.now() - startedAt >= GENERATION_CHANNEL_PACK_DEADLINE_MS
          ) {
            onToast?.(
              "블로그 편집본을 먼저 표시했어요. 플레이스·인스타는 각 메뉴에서 이어 받을 수 있어요.",
              "info"
            );
          }
          try {
            brandHooks?.onFormPersist?.(input);
          } catch (persistErr) {
            onToast?.(
              persistErr?.message || BACKGROUND_OPS.brandPersistFailed,
              "info"
            );
          }

          let savedPlace = null;
          let savedInsta = null;
          let savedImagePrompt = null;

          const p = personalizationRef.current;
          const sharedOptionLock = SHARED_CHANNEL_OPTION_KEYS.reduce((acc, key) => {
            const value = pipelineInput[key] ?? input[key];
            if (value !== undefined && value !== null && value !== "") {
              acc[key] = value;
            }
            return acc;
          }, {});
          const sharedOptionKeys = Object.keys(sharedOptionLock);
          setChannelOptionLockStatus({
            active: sharedOptionKeys.length > 0,
            source: "blog",
            channels: ["instagram", "place"],
            keys: sharedOptionKeys,
            appliedAt: new Date().toISOString(),
          });
          const derivedInput = {
            ...input,
            ...sharedOptionLock,
            userWritingBrief: p?.userBrief,
            brandFeedbackBrief: p?.feedbackBrief,
            styleContinuityBrief: p?.styleContinuityBrief,
            brandKnowledgeBrief: p?.brandKnowledgeBrief,
            personalizationAddon: p?.combinedPromptAddon,
            combinedPersonalizationAddon: p?.combinedPromptAddon,
            _uiSharedOptionLock: sharedOptionLock,
          };

          if (
            runChannelPack &&
            blogOnScreenRef.current &&
            llmStatus.llmAvailable !== false &&
            (isChannelPackDeferred() ||
              Date.now() - startedAt < GENERATION_CHANNEL_PACK_DEADLINE_MS)
          ) {
            if (!allowPipelineChannel("place")) {
              maybeChannelUpgradeHint();
            }
            const runDerivedChannelTask = async (channel, task) => {
              if (!allowPipelineChannel(channel)) return;
              setGenerating((g) => ({ ...g, [channel]: true }));
              try {
                await task();
              } catch (err) {
                onToast?.(
                  err?.message || BACKGROUND_OPS.channelFailed(
                    channel === "instagram" ? "인스타그램" : "스마트플레이스"
                  ),
                  "info"
                );
              } finally {
                setGenerating((g) => ({ ...g, [channel]: false }));
              }
            };

            setPipelineStep(CUSTOMER_PIPELINE_STEP_LABELS.channelDerive);
            await Promise.allSettled([
              runDerivedChannelTask("instagram", async () => {
                const instaSig = await runDerivedSignatureChannel({
                  channel: "instagram",
                  formValues: derivedInput,
                  pipelineInput,
                  sourceBlog: blog,
                  sourceLabel: result.baseContentLabel,
                  generateResearchAsync,
                  setResearchResult,
                  instaTone,
                });
                if (!instaSig.ok) throw new Error(instaSig.userMessage);
                const insta = instaSig.content;
                setInstagramContent(insta);
                savedInsta = insta;
                brandHooks?.onChannelSaved?.("insta", insta);
              }),
              runDerivedChannelTask("place", async () => {
                const placeSig = await runDerivedSignatureChannel({
                  channel: "place",
                  formValues: derivedInput,
                  pipelineInput,
                  sourceBlog: blog,
                  sourceLabel: result.baseContentLabel,
                  generateResearchAsync,
                  setResearchResult,
                });
                if (!placeSig.ok) throw new Error(placeSig.userMessage);
                const place = placeSig.content;
                setPlaceContent(place);
                savedPlace = place;
                brandHooks?.onChannelSaved?.("place", place);
              }),
            ]);

            if (AUTO_RUN_PROMPT_ON_BLOG && allowPipelineChannel("image")) {
              // 이미지 프롬프트는 비동기로 분리해 3채널 본문 완료 체감을 우선한다.
              void (async () => {
                try {
                  setGenerating((g) => ({ ...g, image: true }));
                  const { options: imgOpts } = buildImageGenerationContext(
                    { sourceChannel: "blog", standalone: false },
                    { imageOptions, blogContent: blog, blogInput: input }
                  );
                  const imgSig = await runDerivedSignatureChannel({
                    channel: "image",
                    formValues: input,
                    pipelineInput,
                    sourceBlog: blog,
                    sourceLabel: result.baseContentLabel,
                    generateResearchAsync,
                    setResearchResult,
                    imageOptions: imgOpts,
                  });
                  if (!imgSig.ok) throw new Error(imgSig.userMessage);
                  const imageState = imgSig.content;
                  setImagePrompts(imageState);
                  savedImagePrompt = imageState.activePrompt || "";
                } catch (err) {
                  onToast?.(
                    err?.message || BACKGROUND_OPS.channelFailed("비주얼 프롬프트"),
                    "info"
                  );
                } finally {
                  setGenerating((g) => ({ ...g, image: false }));
                }
              })();
            }
          }

          if (!demoMode && user?.id && isFullBlog) {
            try {
              const purposeMod = getPurposeModifier(input.purpose);
              const toneMod = getToneModifier(input.tone);
              await saveGeneration(user.id, {
                business_type: input.industry,
                region: (input.region || "").trim(),
                main_keyword: (input.mainKeyword || "").trim(),
                sub_keywords: (input.subKeyword || "").trim(),
                purpose: purposeMod.label,
                tone: toneMod.label,
                blog: serializeContent(blog),
                place: savedPlace ? serializeContent(savedPlace) : null,
                instagram: savedInsta ? serializeContent(savedInsta) : null,
                hashtags: savedInsta?.hashtags?.join?.(" ") || null,
                image_prompt: savedImagePrompt,
                brand_id: pipelineInput.brandId || null,
                full_copy_text: formatBlogFullCopy(blog),
              });
              const memMeta = {
                persona: pipelineInput.v4Speaker || pipelineInput.persona,
                emotionTone:
                  pipelineInput.emotionTemperature || pipelineInput.emotionTone,
                writingTone:
                  pipelineInput.speechStyle || pipelineInput.writingTone,
                skillLevel:
                  pipelineInput.proficiency || pipelineInput.skillLevel,
                qualityScore:
                  blog._meta?.qualityScore?.total ??
                  blog._meta?.coreQuality?.total,
                rewriteCount:
                  blog._meta?.rewriteCount ?? result.meta?.rewriteCount,
                failReasons:
                  blog._meta?.failReasons ??
                  result.meta?.failReasons ??
                  [],
                researchStorage: researchStorage || pipelineInput.researchPayload,
                promptInput: {
                  ...pipelineInput,
                  writing_tone:
                    blog._meta?.writingToneLabel ||
                    pipelineInput.speechStyle,
                  skill_level:
                    blog._meta?.skillLevelLabel ||
                    pipelineInput.proficiency,
                  rewrite_count:
                    blog._meta?.rewriteCount ?? result.meta?.rewriteCount,
                  fail_reasons:
                    blog._meta?.failReasons ?? result.meta?.failReasons ?? [],
                  quality_score:
                    blog._meta?.qualityScore?.total ??
                    blog._meta?.coreQuality?.total,
                  research: researchStorage || pipelineInput.researchPayload,
                },
              };
              const memResult = await persistPipelineToMemory({
                brandId: pipelineInput.brandId,
                blog,
                place: savedPlace,
                instagram: savedInsta,
                meta: memMeta,
              });
              setMemoryContentIds((prev) => {
                const next = { ...prev };
                for (const item of memResult?.saved || []) {
                  if (item?.channel && item?.id) next[item.channel] = item.id;
                }
                return next;
              });
              if (memResult?.warnings?.length) {
                onToast?.(memResult.warnings[0].message, "info");
              }
            } catch (err) {
              onToast?.(
                err?.message
                  ? `저장: ${err.message}`
                  : BACKGROUND_OPS.saveFailed,
                "info"
              );
            }
          }
          setChannelOptionLockStatus((prev) =>
            prev
              ? {
                  ...prev,
                  active: false,
                  completedAt: new Date().toISOString(),
                }
              : prev
          );
        };

        void runPostBlogTail();
      } catch (err) {
        const norm = normalizeBlogGenerationFailure(err);
        setBlogGenHint(norm.message);
        setBlogGenHintSoft(norm.soft);
        setBlogGenHintIsAuth(err?.status === 401 || err?.status === 403);
        finishLoadingOverlay(overlayChannel, startedAt, {
          success: false,
          message: norm.message,
          hintIsAuth: err?.status === 401 || err?.status === 403,
          hintSoft: norm.soft,
          toastType: norm.toastType,
        });
      } finally {
        if (!overlaySuccess) {
          blogGenLock.current = false;
          setGenerationSessionActive(false);
          setGenerating((g) => ({ ...g, blog: false }));
          setLoadingOverlay({
            active: false,
            channel: "blog",
            complete: false,
            stepLabel: null,
            startedAt: null,
            estimatedMs: null,
            sensitiveIndustry: false,
          });
        } else {
          setGenerating((g) => ({ ...g, blog: false }));
          blogGenLock.current = false;
        }
      }
    };

    const commitFormToContext = () => {
      startTransition(() => {
        setBlogInput(input);
        setTouched(true);
      });
    };

    const kickoff = () => {
      unlockAudioFromUserGesture();
      void runGeneration();
    };

    const scheduleGeneration = () => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(kickoff);
      } else {
        kickoff();
      }
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        commitFormToContext();
        requestAnimationFrame(scheduleGeneration);
      });
    } else {
      commitFormToContext();
      scheduleGeneration();
    }
  }, [
    blogInput,
    clearDerived,
    demoMode,
    onToast,
    user?.id,
    brandHooks,
    finishLoadingOverlay,
    generating.blog,
    instaTone,
    imageOptions,
    llmStatus.llmAvailable,
    allowPipelineChannel,
    maybeChannelUpgradeHint,
    requireEmailVerified,
    billingPlanId,
  ]);

  const persistChannelMemory = useCallback(
    async (channel, content, meta = {}) => {
      if (demoMode || !brandHooks?.activeBrandId || !content) return;
      const brandId = brandHooks.activeBrandId;
      try {
        const existingId = memoryContentIds[channel];
        if (existingId) {
          await persistMemoryRewrite({
            contentItemId: existingId,
            channel,
            content,
            meta: meta.promptInput ? meta : buildMemMeta(content, meta),
          });
          return;
        }
        const { saved, warnings } = await persistPipelineToMemory({
          brandId,
          blog: channel === "blog" ? content : null,
          place: channel === "place" ? content : null,
          instagram: channel === "instagram" ? content : null,
          meta: meta.promptInput ? meta : buildMemMeta(content, meta),
        });
        const item = saved?.find((s) => s.channel === channel) || saved?.[0];
        if (item?.id) {
          setMemoryContentIds((prev) => ({ ...prev, [channel]: item.id }));
        }
        if (warnings?.length) {
          onToast?.(warnings[0].message, "info");
        }
      } catch (err) {
        onToast?.(err?.message || BACKGROUND_OPS.saveFailed, "info");
      }
    },
    [demoMode, brandHooks?.activeBrandId, memoryContentIds, buildMemMeta, onToast]
  );

  const loadMemoryContentIntoWorkspace = useCallback(
    (item) => {
      const channel = item?.channel;
      if (!channel) return false;
      const content = pipelineContentFromMemoryItem(channel, item);
      if (!content) {
        onToast?.("구조 복원이 어려워요. 복사본을 참고해 주세요.", "info");
        return false;
      }
      if (channel === "blog") setBlogContent(content);
      else if (channel === "place") setPlaceContent(content);
      else if (channel === "instagram") setInstagramContent(content);
      if (item.id) {
        setMemoryContentIds((prev) => ({ ...prev, [channel]: item.id }));
      }
      return true;
    },
    [onToast]
  );

  const persistChannelHistory = useCallback(
    async (channel, formValues, content) => {
      if (demoMode || !user?.id || !content) return;
      try {
        await saveChannelGeneration(user.id, {
          channel,
          formValues,
          content,
          brandId: brandHooks?.activeBrandId,
        });
      } catch {
        /* history optional */
      }
    },
    [demoMode, user?.id, brandHooks?.activeBrandId]
  );

  const buildRewriteCtx = useCallback(
    () =>
      createPromptContext({
        ...normalizePipelineInput(blogInput),
        brandMemory: brandHooks?.activeBrand,
        brandId: brandHooks?.activeBrandId,
      }),
    [blogInput, brandHooks]
  );

  const rewriteBlogContent = useCallback(
    async (feedbackText, scope = "all", options = {}) => {
      if (!blogContent) return null;
      const isFeedbackFlow = options.source === "feedback";
      const tagIds = options.tagIds || [];
      const inputPatch = options.inputPatch || {};

      if (
        !isFeedbackFlow &&
        (blogContent._meta?.isBriefOnly || llmStatus.llmAvailable === false)
      ) {
        onToast?.(LLM_USER_MESSAGES.rewriteBlocked, "info");
        return null;
      }

      if (Object.keys(inputPatch).length > 0) {
        setBlogInput((prev) => ({ ...prev, ...inputPatch }));
      }

      const startedAt = Date.now();
      const setFeedbackStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: "feedback",
          complete: false,
          stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        });

      if (isFeedbackFlow) {
        void unlockAudioFromUserGesture().then(() => {
          setFeedbackStep(FEEDBACK_REWRITE_STEPS[0].text);
        });
        setGenerating((g) => ({ ...g, blog: true }));

        try {
          const topicMain =
            blogInput.topic?.trim()?.split(/[,，]/)[0]?.trim() ||
            blogInput.mainKeyword?.trim() ||
            "";
          const intentHints = inputPatch.feedbackHints || [];
          const patchedInput = applyChannelFeedbackPatch(
            { ...blogInput, ...inputPatch },
            feedbackText,
            "blog"
          );
          const intentBrief = formatFeedbackIntentBrief(intentHints, feedbackText);
          const regenDirective = buildFeedbackRegenDirective(intentHints, feedbackText);
          const feedbackBrief = [
            patchedInput.brandFeedbackBrief,
            intentBrief,
            regenDirective,
          ]
            .filter(Boolean)
            .join(" · ");
          const includeWithFeedback = [patchedInput.includePhrases, intentBrief]
            .filter(Boolean)
            .join(", ");
          const pipelineInput = normalizePipelineInput({
            ...patchedInput,
            includePhrases: includeWithFeedback,
            topic: patchedInput.topic?.trim() || topicMain,
            mainKeyword: topicMain || patchedInput.mainKeyword,
            feedbackHints: mergeFeedbackHints(
              blogInput.feedbackHints,
              intentHints,
              feedbackText
            ),
            feedbackIntentBrief: intentBrief,
            feedbackRegenDirective: regenDirective,
            feedbackSeed: feedbackRegenSeed(
              [feedbackText, ...intentHints].join("|")
            ),
            brandFeedbackBrief: feedbackBrief,
            brandMemory: brandHooks?.activeBrand || patchedInput.brandMemory,
            brandId: brandHooks?.activeBrandId || patchedInput.brandId,
            v2AxisRequired: true,
            v2PipelineEnforced: true,
            v3EngineEnforced: true,
            rewriteCount: (blogContent._meta?.rewriteCount || 0) + 1,
          });

          const useSurgicalFeedback = !shouldFeedbackFullRegen({
            intents: intentHints,
            tagIds,
            scope,
            memo: feedbackText,
            inputPatch,
            existingPack: blogContent,
          });

          if (useSurgicalFeedback) {
            setFeedbackStep(FEEDBACK_REWRITE_STEPS[1].text);
            const ctx = buildRewriteCtx();
            const { pack: surgicalPack, intent } = applyFeedbackSurgicalRewrite(
              blogContent,
              feedbackText,
              { ...ctx, input: pipelineInput },
              scope,
              tagIds,
              pipelineInput
            );
            const feedbackAppliedSummary = formatFeedbackAppliedCustomerLine(
              intentHints,
              feedbackText
            );
            const next = {
              ...surgicalPack,
              _edited: true,
              _meta: {
                ...surgicalPack._meta,
                rewritten: true,
                feedbackRewrite: true,
                feedbackSurgical: true,
                rewriteCount: pipelineInput.rewriteCount,
                feedbackAppliedSummary: feedbackAppliedSummary || undefined,
                feedbackAppliedIntents: intentHints,
              },
            };
            setFeedbackStep(FEEDBACK_REWRITE_STEPS[2].text);
            setBlogContent(next);
            clearDerived();
            recordRewriteLearning(
              brandHooks?.activeBrandId,
              "blog",
              feedbackText,
              intent
            );
            persistChannelMemory("blog", next, buildMemMeta(next));
            trackContentEvent({
              eventType: "rewrite",
              brandId: brandHooks?.activeBrandId,
              contentItemId: memoryContentIds.blog,
              channel: "blog",
              meta: { scope, source: "feedback", surgical: true },
            });
            finishLoadingOverlay("feedback", startedAt, {
              success: true,
              message: "피드백이 반영된 편집본을 다듬었습니다.",
            });
            return { ok: true, pack: next, intent };
          }

          setFeedbackStep(FEEDBACK_REWRITE_STEPS[1].text);
          let result = await ensureBlogDelivery(pipelineInput, {
            setPipelineStep: setFeedbackStep,
            onRetry: () => setFeedbackStep("다시 이어서 쓰는 중…"),
          });

          let blog = result.blogContent;
          if (!blog?.sections?.length) {
            result = await ensureBlogDelivery(pipelineInput, {
              setPipelineStep: setFeedbackStep,
              onRetry: () => setFeedbackStep("글을 화면에 준비하는 중…"),
            });
            blog = result.blogContent;
          }
          if (!blog?.sections?.length) {
            const rescued = allowBlogUiRescue()
              ? forceLocalBlogPreviewDelivery(pipelineInput, result) ||
                (() => {
                  const pack = missionProseFallbackForUi(pipelineInput);
                  return pack
                    ? { ok: true, blogContent: pack, withheld: false, softPass: true }
                    : null;
                })()
              : null;
            blog = rescued?.blogContent;
          }

          if (!blog?.sections?.length) {
            const failMsg =
              result?.userMessage || "피드백 반영에 실패했습니다. 다시 시도해 주세요.";
            finishLoadingOverlay("feedback", startedAt, {
              success: false,
              message: failMsg,
            });
            onToast?.(failMsg, "error");
            return { ok: false };
          }

          const feedbackAppliedSummary = formatFeedbackAppliedCustomerLine(
            intentHints,
            feedbackText
          );
          let next = {
            ...blog,
            _edited: true,
            _meta: {
              ...blog._meta,
              rewritten: true,
              feedbackRewrite: true,
              rewriteCount: pipelineInput.rewriteCount,
              feedbackAppliedSummary: feedbackAppliedSummary || undefined,
              feedbackAppliedIntents: intentHints,
            },
          };

          next = polishFeedbackRewritePack(
            next,
            buildRewriteCtx(),
            pipelineInput
          );
          next = {
            ...next,
            _edited: true,
            _meta: {
              ...next._meta,
              feedbackFullRegen: true,
            },
          };

          setFeedbackStep(FEEDBACK_REWRITE_STEPS[2].text);
          setBlogContent(next);
          clearDerived();
          recordRewriteLearning(
            brandHooks?.activeBrandId,
            "blog",
            feedbackText,
            parseFeedbackIntent(feedbackText, tagIds)
          );
          persistChannelMemory("blog", next, buildMemMeta(next));
          trackContentEvent({
            eventType: "rewrite",
            brandId: brandHooks?.activeBrandId,
            contentItemId: memoryContentIds.blog,
            channel: "blog",
            meta: { scope, source: "feedback", regen: true },
          });

          finishLoadingOverlay("feedback", startedAt, {
            success: true,
            message: "피드백이 반영된 새 글을 받았습니다.",
          });
          return { ok: true, pack: next, intent: parseFeedbackIntent(feedbackText, tagIds) };
        } catch (err) {
          finishLoadingOverlay("feedback", startedAt, {
            success: false,
            message: err?.message || "피드백 반영에 실패했습니다.",
          });
          onToast?.(err?.message || "피드백 반영에 실패했습니다.", "error");
          return { ok: false };
        } finally {
          setGenerating((g) => ({ ...g, blog: false }));
        }
      }

      const effectiveInput = { ...blogInput, ...inputPatch };
      const ctx = buildRewriteCtx();
      const normalizedInput = normalizePipelineInput(effectiveInput);
      const result = runRewrite(
        "blog",
        blogContent,
        feedbackText,
        {
          ...ctx,
          input: normalizedInput,
        },
        scope,
        tagIds
      );
      let next = polishFeedbackRewritePack(result.pack, ctx, normalizedInput);
      next = { ...next, _edited: true };
      setBlogContent(next);
      clearDerived();
      recordRewriteLearning(
        brandHooks?.activeBrandId,
        "blog",
        feedbackText,
        result.intent
      );
      persistChannelMemory("blog", next, buildMemMeta(next));
      trackContentEvent({
        eventType: "rewrite",
        brandId: brandHooks?.activeBrandId,
        contentItemId: memoryContentIds.blog,
        channel: "blog",
        meta: { scope },
      });

      const genMode = next._meta?.generationMode || "";
      const canDerive =
        options.deriveChannels === true &&
        !next._meta?.isBriefOnly &&
        (genMode === "llm" || genMode.startsWith("llm_")) &&
        llmStatus.llmAvailable !== false;

      if (!canDerive) {
        onToast?.("피드백이 반영되었습니다.", "success");
        return { ok: true, ...result };
      }

      const setPipelineStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: isFeedbackFlow ? "feedback" : "pipeline",
          complete: false,
          stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        });

      try {
        if (!allowPipelineChannel("place")) {
          maybeChannelUpgradeHint();
        }
        setPipelineStep(
          isFeedbackFlow
            ? FEEDBACK_REWRITE_STEPS[2].text
            : "스마트플레이스 작성 중..."
        );
        setGenerating((g) => ({ ...g, place: true }));
        try {
          if (!allowPipelineChannel("place")) throw new Error("SKIP_CHANNEL");
          const place = runPlacePipeline(effectiveInput, next, baseContentLabel);
          place._initialPlain = [place.title, place.shortNotice, place.detailBody]
            .filter(Boolean)
            .join("\n");
          setPlaceContent(place);
          brandHooks?.onChannelSaved?.("place", place);
          persistChannelMemory("place", place);
        } catch (err) {
          if (err?.message !== "SKIP_CHANNEL") {
            onToast?.(err?.message || "플레이스 자동 생성 실패", "error");
          }
        } finally {
          setGenerating((g) => ({ ...g, place: false }));
        }

        setPipelineStep(
          isFeedbackFlow ? FEEDBACK_REWRITE_STEPS[2].text : "인스타그램 작성 중..."
        );
        setGenerating((g) => ({ ...g, instagram: true }));
        try {
          if (!allowPipelineChannel("instagram")) throw new Error("SKIP_CHANNEL");
          const insta = runInstagramPipeline(
            effectiveInput,
            next,
            instaTone,
            baseContentLabel
          );
          insta._initialPlain = insta.lineBreakBody || insta.body || "";
          setInstagramContent(insta);
          brandHooks?.onChannelSaved?.("insta", insta);
          persistChannelMemory("instagram", insta);
        } catch (err) {
          if (err?.message !== "SKIP_CHANNEL") {
            onToast?.(err?.message || "인스타 자동 생성 실패", "error");
          }
        } finally {
          setGenerating((g) => ({ ...g, instagram: false }));
        }

        if (AUTO_RUN_PROMPT_ON_BLOG) {
          if (!isFeedbackFlow) {
            setPipelineStep("프롬프트 작성 중...");
          }
          setGenerating((g) => ({ ...g, image: true }));
          try {
            if (!allowPipelineChannel("image")) throw new Error("SKIP_CHANNEL");
            const { options: imgOpts } = buildImageGenerationContext(
              { sourceChannel: "blog", standalone: false },
              { imageOptions, blogContent: next, blogInput: effectiveInput }
            );
            const pack = runImagePipeline(
              effectiveInput,
              next,
              imgOpts,
              baseContentLabel
            );
            setImagePrompts({
              ...pack,
              engineStatus: "preparing",
              activePrompt:
                pack.thumbnailPrompt || pack[imgOpts.purpose] || "",
            });
          } catch (err) {
            if (err?.message !== "SKIP_CHANNEL") {
              onToast?.(err?.message || "프롬프트 생성 실패", "error");
            }
          } finally {
            setGenerating((g) => ({ ...g, image: false }));
          }
        }

        setPipelineStep(
          isFeedbackFlow
            ? FEEDBACK_REWRITE_STEPS[3].text
            : "최종 검수 중..."
        );
        finishLoadingOverlay(isFeedbackFlow ? "feedback" : "pipeline", startedAt, {
          success: true,
          message: "피드백이 반영되었습니다.",
        });
      } catch (err) {
        finishLoadingOverlay(isFeedbackFlow ? "feedback" : "pipeline", startedAt, {
          success: false,
          message: err?.message || "파생 콘텐츠 생성 중 오류가 발생했습니다.",
        });
      }

      return result;
    },
    [
      blogContent,
      blogInput,
      buildRewriteCtx,
      brandHooks,
      onToast,
      persistChannelMemory,
      clearDerived,
      baseContentLabel,
      instaTone,
      imageOptions,
      finishLoadingOverlay,
      llmStatus.llmAvailable,
      allowPipelineChannel,
      maybeChannelUpgradeHint,
    ]
  );

  const rewritePlaceContent = useCallback(
    async (feedbackText, scope = "all", options = {}) => {
      if (!allowPipelineChannel("place")) {
        onToast?.(CHANNEL_UPGRADE_HINT, "info");
        return null;
      }
      if (!placeContent) return null;
      const rewriteSource = resolveBlogLikeForRewrite("place", {
        blogContent,
        placeContent,
        instagramContent,
        blogInput,
        baseContentLabel,
        sourceChannel,
      });
      if (!rewriteSource?.blogLike) {
        onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
        return null;
      }
      const isFeedbackFlow = options.source === "feedback";
      const tagIds = options.tagIds || [];
      const startedAt = Date.now();
      const overlayChannel = isFeedbackFlow ? "place-feedback" : "place";
      const setStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: overlayChannel,
          complete: false,
          stepLabel,
        });

      if (isFeedbackFlow) {
        void unlockAudioFromUserGesture().then(() => {
          setStep(PLACE_FEEDBACK_REWRITE_STEPS[0].text);
        });
      }

      const patchedInput = applyChannelFeedbackPatch(
        { ...blogInput, feedbackHints: feedbackText, feedbackSeed: feedbackRegenSeed(feedbackText) },
        feedbackText,
        "place"
      );

      let next = null;
      let result = null;

      try {
        if (isFeedbackFlow) {
          setStep(PLACE_FEEDBACK_REWRITE_STEPS[1].text);
        }
        setGenerating((g) => ({ ...g, place: true }));
        const place = runPlacePipeline(patchedInput, blogContent, baseContentLabel);
        place._initialPlain = [place.title, place.shortNotice, place.detailBody]
          .filter(Boolean)
          .join("\n");
        next = place;

        if (scope !== "all" || tagIds.length > 0) {
          const ctx = buildRewriteCtx();
          result = runRewrite("place", place, feedbackText, {
            ...ctx,
            input: normalizePipelineInput(patchedInput),
          }, scope, tagIds);
          next = { ...result.pack, _edited: true };
        } else {
          next = { ...next, _edited: true };
        }

        next = polishChannelPackAfterPipeline(
          "place",
          next,
          normalizePipelineInput(patchedInput),
          buildRewriteCtx()
        );

        if (isFeedbackFlow) {
          setStep(PLACE_FEEDBACK_REWRITE_STEPS[2].text);
        }
        setPlaceContent(next);
        recordRewriteLearning(
          brandHooks?.activeBrandId,
          "place",
          feedbackText,
          result?.intent
        );
        persistChannelMemory("place", next);
        brandHooks?.onChannelSaved?.("place", next);
        trackContentEvent({
          eventType: "rewrite",
          brandId: brandHooks?.activeBrandId,
          contentItemId: memoryContentIds.place,
          channel: "place",
          meta: { scope, source: options.source },
        });

        if (isFeedbackFlow) {
          setStep(PLACE_FEEDBACK_REWRITE_STEPS[3].text);
          finishLoadingOverlay("place-feedback", startedAt, {
            success: true,
            message: "스마트플레이스 피드백이 반영되었습니다.",
          });
        } else {
          onToast?.("플레이스 수정이 반영되었습니다.", "success");
        }
        return result || { pack: next, intent: { scope } };
      } catch (err) {
        if (isFeedbackFlow) {
          finishLoadingOverlay("place-feedback", startedAt, {
            success: false,
            message: err?.message || "플레이스 반영 실패",
          });
        } else {
          onToast?.(err?.message || "플레이스 반영 실패", "error");
        }
        return null;
      } finally {
        setGenerating((g) => ({ ...g, place: false }));
      }
    },
    [
      placeContent,
      blogContent,
      blogInput,
      buildRewriteCtx,
      brandHooks,
      onToast,
      persistChannelMemory,
      baseContentLabel,
      finishLoadingOverlay,
      memoryContentIds.place,
      allowPipelineChannel,
    ]
  );

  const applyEditorImprove = useCallback(
    (channel, actionId) => {
      const ctx = buildRewriteCtx();
      const input = normalizePipelineInput(blogInput);
      const ctxFull = { ...ctx, input };
      const brandId = brandHooks?.activeBrandId;

      const run = (content, setter, ch, contentIdPrefix) => {
        if (!content) return null;
        setEditorImproving(true);
        try {
          const beforeScores = content.editorAI?.scores;
          const { pack } = autoImproveContent(ch, content, actionId, ctxFull);
          const report = runEditorAI(ch, pack, ctx);
          const updated = {
            ...pack,
            editorAI: report,
            _edited: true,
            _meta: {
              ...pack._meta,
              editorAI: report,
              editorCompare: compareEditorScores(beforeScores, report.scores),
            },
          };
          setter(updated);
          if (brandId) learnEditorAIAction(brandId, actionId);
          pushRewriteVersion(`${contentIdPrefix}-${brandId}`, {
            label: `문장 다듬기 · ${actionId}`,
            content: updated,
            feedbackText: actionId,
            editorAIScore: report.summary?.overall,
          });
          const cmp = updated._meta.editorCompare;
          if (cmp?.before != null && cmp?.after != null) {
            onToast?.(
              EDITOR_IMPROVE.toastScore(cmp.before, cmp.after),
              "success"
            );
          } else {
            onToast?.(EDITOR_IMPROVE.toastDone, "success");
          }
          return updated;
        } finally {
          setEditorImproving(false);
        }
      };

      if (channel === "blog") return run(blogContent, setBlogContent, "blog", "blog");
      if (channel === "place") return run(placeContent, setPlaceContent, "place", "place");
      if (channel === "instagram") {
        return run(instagramContent, setInstagramContent, "instagram", "insta");
      }
      return null;
    },
    [
      blogContent,
      placeContent,
      instagramContent,
      blogInput,
      buildRewriteCtx,
      brandHooks,
      onToast,
    ]
  );

  const rewriteInstagramContent = useCallback(
    async (feedbackText, scope = "all", options = {}) => {
      if (!allowPipelineChannel("instagram")) {
        onToast?.(CHANNEL_UPGRADE_HINT, "info");
        return null;
      }
      if (!instagramContent) return null;
      const rewriteSource = resolveBlogLikeForRewrite("instagram", {
        blogContent,
        placeContent,
        instagramContent,
        blogInput,
        baseContentLabel,
        sourceChannel,
      });
      if (!rewriteSource?.blogLike) {
        onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
        return null;
      }
      const isFeedbackFlow = options.source === "feedback";
      const tagIds = options.tagIds || [];
      const startedAt = Date.now();
      const overlayChannel = isFeedbackFlow ? "instagram-feedback" : "instagram";
      const setStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: overlayChannel,
          complete: false,
          stepLabel,
        });

      if (isFeedbackFlow) {
        void unlockAudioFromUserGesture().then(() => {
          setStep(INSTA_FEEDBACK_REWRITE_STEPS[0].text);
        });
      }

      const patchedInput = applyChannelFeedbackPatch(
        {
          ...blogInput,
          feedbackHints: feedbackText,
          feedbackSeed: feedbackRegenSeed(feedbackText),
        },
        feedbackText,
        "instagram"
      );

      let next = null;
      let result = null;

      try {
        if (isFeedbackFlow) {
          setStep(INSTA_FEEDBACK_REWRITE_STEPS[1].text);
        }
        setGenerating((g) => ({ ...g, instagram: true }));
        const insta = runInstagramPipeline(
          patchedInput,
          rewriteSource.blogLike,
          instaTone,
          rewriteSource.baseLabel || baseContentLabel
        );
        insta._initialPlain = insta.lineBreakBody || insta.body || "";
        next = insta;

        if (scope !== "all" || tagIds.length > 0) {
          const ctx = buildRewriteCtx();
          result = runRewrite("instagram", insta, feedbackText, {
            ...ctx,
            input: normalizePipelineInput(patchedInput),
          }, scope, tagIds);
          next = { ...result.pack, _edited: true };
        } else {
          next = { ...next, _edited: true };
        }

        next = polishChannelPackAfterPipeline(
          "instagram",
          next,
          normalizePipelineInput(patchedInput),
          buildRewriteCtx()
        );

        if (isFeedbackFlow) {
          setStep(INSTA_FEEDBACK_REWRITE_STEPS[2].text);
        }
        setInstagramContent(next);
        recordRewriteLearning(
          brandHooks?.activeBrandId,
          "instagram",
          feedbackText,
          result?.intent
        );
        persistChannelMemory("instagram", next);
        brandHooks?.onChannelSaved?.("insta", next);
        trackContentEvent({
          eventType: "rewrite",
          brandId: brandHooks?.activeBrandId,
          contentItemId: memoryContentIds.instagram,
          channel: "instagram",
          meta: { scope, source: options.source },
        });

        if (isFeedbackFlow) {
          setStep(INSTA_FEEDBACK_REWRITE_STEPS[3].text);
          finishLoadingOverlay("instagram-feedback", startedAt, {
            success: true,
            message: "인스타그램 피드백이 반영되었습니다.",
          });
        } else {
          onToast?.("인스타 수정이 반영되었습니다.", "success");
        }
        return result || { pack: next, intent: { scope } };
      } catch (err) {
        if (isFeedbackFlow) {
          finishLoadingOverlay("instagram-feedback", startedAt, {
            success: false,
            message: err?.message || "인스타 반영 실패",
          });
        } else {
          onToast?.(err?.message || "인스타 반영 실패", "error");
        }
        return null;
      } finally {
        setGenerating((g) => ({ ...g, instagram: false }));
      }
    },
    [
      instagramContent,
      blogContent,
      blogInput,
      instaTone,
      buildRewriteCtx,
      brandHooks,
      onToast,
      persistChannelMemory,
      baseContentLabel,
      finishLoadingOverlay,
      memoryContentIds.instagram,
      allowPipelineChannel,
    ]
  );

  const prepareChannelForm = useCallback(
    (inputOverride) => {
      const base = inputOverride ?? blogInput;
      const topicMain =
        base.topic?.trim()?.split(/[,，]/)[0]?.trim() ||
        base.mainKeyword?.trim() ||
        "";
      const normalizedBase = {
        ...base,
        topic: base.topic?.trim() || topicMain,
        mainKeyword: topicMain || base.mainKeyword,
      };
      const ensured = ensureChannelGenerateInput(
        normalizedBase,
        brandHooks?.activeBrand
      );
      if (!inputOverride && ensured.changed) {
        setBlogInput((prev) => ({
          ...prev,
          ...ensured.values,
          topic: ensured.values.topic?.trim() || prev.topic,
          mainKeyword: ensured.values.mainKeyword?.trim() || prev.mainKeyword,
        }));
      }
      if (!ensured.ok) {
        onToast?.(
          "브랜드명을 확인하고, 주제를 입력하거나 아래 영감에서 골라 주세요.",
          "error"
        );
        return null;
      }
      return ensured.values;
    },
    [blogInput, brandHooks?.activeBrand, onToast]
  );

  const commitChannelFormFromOpts = useCallback(
    (opts, formValues) => {
      if (!opts.inputOverride) return;
      flushSync(() => {
        setBlogInput(formValues);
        if (opts.instaToneOverride != null) setInstaTone(opts.instaToneOverride);
        if (opts.imageOptionsOverride) setImageOptions(opts.imageOptionsOverride);
      });
    },
    []
  );

  const isDerivationSourceAligned = useCallback((formValues, source) => {
    if (!source || source.standalone) return true;
    if (source.sourceChannel === "blog") return true;
    const anchor = [
      formValues.brandName,
      formValues.topic,
      formValues.mainKeyword,
      formValues.region,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter((v) => v.length >= 2);
    if (!anchor.length) return true;
    const blogLike = source.blogLike || {};
    const blob = [
      blogLike.title,
      blogLike.representativeTitle,
      ...(blogLike.sections || []).map((s) => s?.heading),
      ...(blogLike.sections || []).map((s) => s?.body),
      blogLike.conclusion,
    ]
      .filter(Boolean)
      .join("\n");
    const hits = anchor.filter((k) => blob.includes(k)).length;
    return hits >= Math.max(1, Math.ceil(anchor.length * 0.5));
  }, []);

  const generatePlace = useCallback((opts = {}) => {
    if (!requireEmailVerified()) return;
    if (!allowPipelineChannel("place")) {
      onToast?.(CHANNEL_UPGRADE_HINT, "info");
      return;
    }
    const formValues = prepareChannelForm(opts.inputOverride);
    if (!formValues) return;
    commitChannelFormFromOpts(opts, formValues);
    let source = opts.preferStandalone
      ? {
          sourceChannel: "form",
          blogLike: null,
          baseLabel: buildSourceLabel("place", formValues),
          standalone: true,
        }
      : resolveDerivationSource("place", {
          blogContent,
          placeContent,
          instagramContent,
          blogInput: formValues,
          baseContentLabel,
          sourceChannel,
        });
    if (!isDerivationSourceAligned(formValues, source)) {
      source = {
        sourceChannel: "form",
        blogLike: null,
        baseLabel: buildSourceLabel("place", formValues),
        standalone: true,
      };
    }
    if (!source) {
      onToast?.("주제·브랜드명을 입력한 뒤 생성해 주세요.", "error");
      return;
    }
    if (
      source.sourceChannel === "blog" &&
      blogContent?._meta?.isBriefOnly
    ) {
      onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
      return;
    }
    if (llmStatus.llmAvailable === false) {
      onToast?.(LLM_USER_MESSAGES.engineNotConnected, "info");
      return;
    }
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    const setPipelineStep = (stepLabel) =>
      setLoadingOverlay((prev) => ({
        ...prev,
        active: true,
        channel: "place",
        complete: false,
        stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        startedAt: prev.startedAt ?? startedAt,
      }));
    void unlockAudioFromUserGesture().then(() => {
      setLoadingOverlay({
        active: true,
        channel: "place",
        complete: false,
        stepLabel: CUSTOMER_PIPELINE_STEP_LABELS.research,
        startedAt,
      });
    });
    setGenerating((g) => ({ ...g, place: true }));
    const runGeneration = async () => {
      try {
        const sig = await runSignatureChannelGeneration({
          channel: "place",
          formValues,
          generateResearchAsync,
          setResearchResult,
          onStep: setPipelineStep,
          sourceBlog: source.standalone
            ? null
            : source.blogLike || blogContent,
          sourceLabel: source.baseLabel,
        });
        if (!sig.ok) {
          const fallbackPlace = runPlacePipeline(
            formValues,
            source.blogLike || blogContent,
            source.baseLabel
          );
          fallbackPlace._meta = {
            ...(fallbackPlace._meta || {}),
            generationMode: "place_local_fallback",
            fallbackReason: sig.userMessage || "signature_failed",
          };
          setPlaceContent(fallbackPlace);
          setBaseContentLabel(source.baseLabel);
          setSourceChannel(source.standalone ? "place" : source.sourceChannel);
          brandHooks?.onChannelSaved?.("place", fallbackPlace);
          persistChannelMemory("place", fallbackPlace);
          void persistChannelHistory("place", formValues, fallbackPlace);
          onToast?.(
            "플레이스 시그니처 생성이 지연되어 로컬 안전 생성본으로 표시했습니다.",
            "info"
          );
          finishLoadingOverlay("place", startedAt, { success: true });
          return;
        }
        setPlaceContent(sig.content);
        setBaseContentLabel(sig.baseContentLabel || source.baseLabel);
        setSourceChannel(source.standalone ? "place" : source.sourceChannel);
        brandHooks?.onChannelSaved?.("place", sig.content);
        persistChannelMemory("place", sig.content);
        void persistChannelHistory("place", formValues, sig.content);
        recordGenerationSignal(brandHooks?.activeBrandId, "place", {
          title: sig.content?.title,
        });
        finishLoadingOverlay("place", startedAt, { success: true });
      } catch (err) {
        onToast?.(err?.message || "플레이스 소개글 만들기 실패", "error");
        finishLoadingOverlay("place", startedAt, {
          success: false,
          message: err?.message,
          toastType: "error",
        });
      } finally {
        setGenerating((g) => ({ ...g, place: false }));
        setGenerationSessionActive(false);
      }
    };
    void runGeneration();
  }, [
    blogInput,
    blogContent,
    placeContent,
    instagramContent,
    baseContentLabel,
    sourceChannel,
    onToast,
    brandHooks,
    finishLoadingOverlay,
    llmStatus.llmAvailable,
    generateResearchAsync,
    persistChannelMemory,
    persistChannelHistory,
    allowPipelineChannel,
    prepareChannelForm,
    commitChannelFormFromOpts,
    isDerivationSourceAligned,
    requireEmailVerified,
  ]);

  const generateInstagram = useCallback((opts = {}) => {
    if (!requireEmailVerified()) return;
    if (!allowPipelineChannel("instagram")) {
      onToast?.(CHANNEL_UPGRADE_HINT, "info");
      return;
    }
    const formValues = prepareChannelForm(opts.inputOverride);
    if (!formValues) return;
    commitChannelFormFromOpts(opts, formValues);
    const tone = opts.instaToneOverride ?? instaTone;
    let source = opts.preferStandalone
      ? {
          sourceChannel: "form",
          blogLike: null,
          baseLabel: buildSourceLabel("instagram", formValues),
          standalone: true,
        }
      : resolveDerivationSource("instagram", {
          blogContent,
          placeContent,
          instagramContent,
          blogInput: formValues,
          baseContentLabel,
          sourceChannel,
        });
    if (!isDerivationSourceAligned(formValues, source)) {
      source = {
        sourceChannel: "form",
        blogLike: null,
        baseLabel: buildSourceLabel("instagram", formValues),
        standalone: true,
      };
    }
    if (!source) {
      onToast?.("주제·브랜드명을 입력한 뒤 만들어 주세요.", "error");
      return;
    }
    if (
      source.sourceChannel === "blog" &&
      blogContent?._meta?.isBriefOnly
    ) {
      onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
      return;
    }
    if (llmStatus.llmAvailable === false) {
      onToast?.(LLM_USER_MESSAGES.engineNotConnected, "info");
      return;
    }
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    const setPipelineStep = (stepLabel) =>
      setLoadingOverlay((prev) => ({
        ...prev,
        active: true,
        channel: "instagram",
        complete: false,
        stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        startedAt: prev.startedAt ?? startedAt,
      }));
    void unlockAudioFromUserGesture().then(() => {
      setLoadingOverlay({
        active: true,
        channel: "instagram",
        complete: false,
        stepLabel: CUSTOMER_PIPELINE_STEP_LABELS.research,
        startedAt,
      });
    });
    setGenerating((g) => ({ ...g, instagram: true }));
    const runGeneration = async () => {
      try {
        const sig = await runSignatureChannelGeneration({
          channel: "instagram",
          formValues,
          generateResearchAsync,
          setResearchResult,
          onStep: setPipelineStep,
          sourceBlog: source.standalone
            ? null
            : source.blogLike || blogContent,
          sourceLabel: source.baseLabel,
          instaTone: tone,
        });
        if (!sig.ok) {
          const fallbackInsta = runInstagramPipeline(
            formValues,
            source.blogLike || blogContent,
            tone,
            source.baseLabel
          );
          fallbackInsta._meta = {
            ...(fallbackInsta._meta || {}),
            generationMode: "instagram_local_fallback",
            fallbackReason: sig.userMessage || "signature_failed",
          };
          setInstagramContent(fallbackInsta);
          setBaseContentLabel(source.baseLabel);
          setSourceChannel(
            source.standalone ? "instagram" : source.sourceChannel
          );
          brandHooks?.onChannelSaved?.("insta", fallbackInsta);
          persistChannelMemory("instagram", fallbackInsta);
          void persistChannelHistory("instagram", formValues, fallbackInsta);
          onToast?.(
            "인스타 시그니처 생성이 지연되어 로컬 안전 생성본으로 표시했습니다.",
            "info"
          );
          finishLoadingOverlay("instagram", startedAt, { success: true });
          return;
        }
        setInstagramContent(sig.content);
        setBaseContentLabel(sig.baseContentLabel || source.baseLabel);
        setSourceChannel(
          source.standalone ? "instagram" : source.sourceChannel
        );
        brandHooks?.onChannelSaved?.("insta", sig.content);
        persistChannelMemory("instagram", sig.content);
        void persistChannelHistory("instagram", formValues, sig.content);
        recordGenerationSignal(brandHooks?.activeBrandId, "instagram", {
          hook: sig.content?.hook,
        });
        finishLoadingOverlay("instagram", startedAt, { success: true });
      } catch (err) {
        onToast?.(err?.message || "인스타 캡션 만들기 실패", "error");
        finishLoadingOverlay("instagram", startedAt, {
          success: false,
          message: err?.message,
          toastType: "error",
        });
      } finally {
        setGenerating((g) => ({ ...g, instagram: false }));
        setGenerationSessionActive(false);
      }
    };
    void runGeneration();
  }, [
    blogInput,
    blogContent,
    placeContent,
    instagramContent,
    instaTone,
    baseContentLabel,
    sourceChannel,
    onToast,
    brandHooks,
    finishLoadingOverlay,
    llmStatus.llmAvailable,
    generateResearchAsync,
    persistChannelMemory,
    persistChannelHistory,
    allowPipelineChannel,
    prepareChannelForm,
    commitChannelFormFromOpts,
    requireEmailVerified,
  ]);

  const generateImage = useCallback((opts = {}) => {
    if (!requireEmailVerified()) return;
    if (!allowPipelineChannel("image")) {
      onToast?.(CHANNEL_UPGRADE_HINT, "info");
      return;
    }
    const formValues = prepareChannelForm(opts.inputOverride);
    if (!formValues) return;
    commitChannelFormFromOpts(opts, formValues);
    const imgOptsBase = opts.imageOptionsOverride ?? imageOptions;
    let source = opts.preferStandalone
      ? {
          sourceChannel: "form",
          blogLike: buildFormBlogProxy(formValues),
          baseLabel: buildSourceLabel("image", formValues),
          standalone: true,
        }
      : resolveDerivationSource("image", {
          blogContent,
          placeContent,
          instagramContent,
          blogInput: formValues,
          baseContentLabel,
          sourceChannel,
        });
    if (!source?.blogLike) {
      onToast?.("주제·브랜드명을 입력한 뒤 만들어 주세요.", "error");
      return;
    }
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    void unlockAudioFromUserGesture().then(() => {
      setLoadingOverlay({ active: true, channel: "image", complete: false });
    });
    if (llmStatus.llmAvailable === false) {
      onToast?.(LLM_USER_MESSAGES.engineNotConnected, "info");
      return;
    }
    setGenerating((g) => ({ ...g, image: true }));
    const setPipelineStep = (stepLabel) =>
      setLoadingOverlay((prev) => ({
        ...prev,
        active: true,
        channel: "image",
        complete: false,
        stepLabel: mapCustomerPipelineStepLabel(stepLabel),
        startedAt: prev.startedAt ?? startedAt,
      }));
    const runGeneration = async () => {
      try {
        const { options: imgOpts } = buildImageGenerationContext(source, {
          imageOptions: imgOptsBase,
          blogContent,
          placeContent,
          instagramContent,
          blogInput: formValues,
        });
        setImageOptions(imgOpts);
        const sig = await runSignatureChannelGeneration({
          channel: "image",
          formValues,
          generateResearchAsync,
          setResearchResult,
          onStep: setPipelineStep,
          sourceBlog: source.blogLike,
          sourceLabel: source.baseLabel,
          imageOptions: imgOpts,
        });
        if (!sig.ok) {
          onToast?.(sig.userMessage, sig.soft ? "info" : "error");
          finishLoadingOverlay("image", startedAt, {
            success: false,
            message: sig.userMessage,
            toastType: "info",
          });
          return;
        }
        setImagePrompts(sig.content);
        setBaseContentLabel(sig.baseContentLabel || source.baseLabel);
        setSourceChannel(source.sourceChannel);
        finishLoadingOverlay("image", startedAt, { success: true });
      } catch (err) {
        onToast?.(err?.message || "이미지 프롬프트 생성 실패", "error");
        finishLoadingOverlay("image", startedAt, {
          success: false,
          message: err?.message,
          toastType: "error",
        });
      } finally {
        setGenerating((g) => ({ ...g, image: false }));
        setGenerationSessionActive(false);
      }
    };
    void runGeneration();
  }, [
    blogInput,
    blogContent,
    placeContent,
    instagramContent,
    imageOptions,
    baseContentLabel,
    sourceChannel,
    onToast,
    finishLoadingOverlay,
    llmStatus.llmAvailable,
    generateResearchAsync,
    allowPipelineChannel,
    prepareChannelForm,
    commitChannelFormFromOpts,
    isDerivationSourceAligned,
    requireEmailVerified,
  ]);

  const setBlogInputValidated = useCallback((next) => {
    setBlogInput(next);
  }, []);

  const getSnapshot = useCallback(
    () =>
      toGenerationRecord({
        blogInput,
        blogContent,
        placeContent,
        instagramContent,
        imagePrompts,
        baseContentLabel,
      }),
    [
      blogInput,
      blogContent,
      placeContent,
      instagramContent,
      imagePrompts,
      baseContentLabel,
    ]
  );

  const acknowledgeSignupDraft = useCallback(() => {
    setSignupDraftRestored(false);
  }, []);

  const formValue = useMemo(
    () => ({
      blogInput,
      setBlogInput: setBlogInputValidated,
      formErrors,
      touched,
      setTouched,
      isFormValid: formReady,
      signupDraftRestored,
      acknowledgeSignupDraft,
    }),
    [
      blogInput,
      setBlogInputValidated,
      formErrors,
      touched,
      formReady,
      signupDraftRestored,
      acknowledgeSignupDraft,
    ]
  );

  const pipelineValue = useMemo(
    () => ({
      blogContent,
      placeContent,
      instagramContent,
      imagePrompts,
      baseContentLabel,
      sourceChannel,
      instaTone,
      setInstaTone,
      imageOptions,
      setImageOptions,
      generating,
      hasBlog,
      hasChannelPack,
      hasFullBlog,
      llmStatus,
      blogGenHint,
      blogGenHintIsAuth,
      blogGenHintSoft,
      channelOptionLockStatus,
      pipelineReady,
      isBusy,
      channelStartReady,
      generateBlog,
      updateBlogContent,
      updatePlaceContent,
      updateInstagramContent,
      saveEditedBlog,
      saveEditedPlace,
      saveEditedInstagram,
      generatePlace,
      generateInstagram,
      generateImage,
      rewriteBlogContent,
      rewritePlaceContent,
      rewriteInstagramContent,
      editorImprove: applyEditorImprove,
      editorImproving,
      loadingOverlay,
      blogResultRevealPending,
      acknowledgeBlogResultDisplayed,
      researchResult,
      clearResearchResult: () => setResearchResult(null),
      clearDerived,
      resetToHome,
      getSnapshot,
      demoMode,
      user,
      brandHooks,
      memoryContentIds,
      billingPlanId,
      billingBypassQuotas,
      loadMemoryContentIntoWorkspace,
      onToast,
    }),
    [
      blogContent,
      placeContent,
      instagramContent,
      imagePrompts,
      baseContentLabel,
      sourceChannel,
      instaTone,
      imageOptions,
      generating,
      hasBlog,
      hasChannelPack,
      hasFullBlog,
      hasOtherDraft,
      channelStartReady,
      llmStatus,
      blogGenHint,
      blogGenHintIsAuth,
      blogGenHintSoft,
      channelOptionLockStatus,
      researchResult,
      pipelineReady,
      isBusy,
      generateBlog,
      updateBlogContent,
      updatePlaceContent,
      updateInstagramContent,
      saveEditedBlog,
      saveEditedPlace,
      saveEditedInstagram,
      generatePlace,
      generateInstagram,
      generateImage,
      rewriteBlogContent,
      rewritePlaceContent,
      rewriteInstagramContent,
      applyEditorImprove,
      editorImproving,
      loadingOverlay,
      blogResultRevealPending,
      acknowledgeBlogResultDisplayed,
      clearDerived,
      resetToHome,
      getSnapshot,
      demoMode,
      user,
      brandHooks,
      memoryContentIds,
      billingPlanId,
      billingBypassQuotas,
      loadMemoryContentIntoWorkspace,
      onToast,
    ]
  );

  const value = useMemo(
    () => ({ ...formValue, ...pipelineValue }),
    [formValue, pipelineValue]
  );

  return (
    <ContentFormContext.Provider value={formValue}>
      <ContentPipelineContext.Provider value={pipelineValue}>
        <ContentContext.Provider value={value}>
          {children}
        </ContentContext.Provider>
      </ContentPipelineContext.Provider>
    </ContentFormContext.Provider>
  );
}

export function useContentForm() {
  const ctx = useContext(ContentFormContext);
  if (!ctx) {
    throw new Error("useContentForm must be used within ContentProvider");
  }
  return ctx;
}

export function useContentPipelineState() {
  const ctx = useContext(ContentPipelineContext);
  if (!ctx) {
    throw new Error(
      "useContentPipelineState must be used within ContentProvider"
    );
  }
  return ctx;
}

export function useContentPipeline() {
  const form = useContext(ContentFormContext);
  const pipeline = useContext(ContentPipelineContext);
  if (!form || !pipeline) {
    throw new Error("useContentPipeline must be used within ContentProvider");
  }
  return { ...form, ...pipeline };
}
