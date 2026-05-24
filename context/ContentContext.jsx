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
  BLOG_MIN_BODY_CHARS,
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
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { autoImproveContent } from "@/lib/editorAI/autoImprove";
import { runEditorAI, compareEditorScores } from "@/lib/editorAI";
import { learnEditorAIAction } from "@/lib/learning/brandLearning";
import { pushRewriteVersion } from "@/lib/rewrite/rewriteVersions";
import {
  loadFormDraft,
  saveFormDraft,
} from "@/lib/formDraft";
import { brandMemoryToFormInput } from "@/lib/brands/brandMemory";
import {
  validateForm,
  isFormValid,
  ensureChannelGenerateInput,
} from "@/lib/formValidation";
import { isClientBetaActive } from "@/lib/billing/betaAccessClient";
import {
  generateBlogPipelineAsync,
  generateResearchAsync,
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  runImageStandalone,
  buildFormBlogProxy,
  toGenerationRecord,
  normalizePipelineInput,
} from "@/lib/contentPipeline";
import { LLM_USER_MESSAGES } from "@/lib/llm/messages";
import { EDITOR_IMPROVE } from "@/lib/product/craft";
import {
  EMAIL_VERIFY_USER_MESSAGE,
  isEmailVerified,
} from "@/lib/auth/emailVerification";
import { serializeContent } from "@/lib/contentFormat";
import { saveGeneration } from "@/lib/generations";
import { getPurposeModifier } from "@/lib/prompts/purposes";
import { getToneModifier } from "@/lib/prompts/tones";
import { recordGenerationSignal } from "@/lib/trends/trendIntelligence";
import {
  reapplyBlogEdits,
  reapplyPlaceEdits,
  reapplyInstaEdits,
} from "@/lib/content/reapplyPack";
import { createPromptContext } from "@/utils/promptBuilder";
import {
  extractBlogPlainText,
  checkRecentSimilarity,
} from "@/lib/duplicate/contentSimilarity";
import { learnFromEdit } from "@/lib/learning/brandLearning";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { runRewrite, recordRewriteLearning } from "@/lib/rewrite/rewriteEngine";
import {
  persistPipelineToMemory,
  persistMemoryRewrite,
} from "@/lib/memory/persistGeneration";
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
import { buildResearchBrief, serializeResearchForStorage } from "@/lib/research/buildResearchBrief";
import { AUTO_RUN_PROMPT_ON_BLOG } from "@/lib/channels/channelProducts";
import { isAutoPipelineAfterBlog } from "@/lib/config/productFlags";
import { setGenerationSessionActive } from "@/lib/generation/generationSession";
import { emitBrandFormSync } from "@/lib/workspace/brandFormSync";
import { BACKGROUND_OPS } from "@/lib/product/craft";

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
  const blogGenLock = useRef(false);
  const channelUpgradeHintShown = useRef(false);

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
  });
  const [editorImproving, setEditorImproving] = useState(false);
  const [touched, setTouched] = useState(false);
  const deferredBlogInput = useDeferredValue(blogInput);
  const [llmStatus, setLlmStatus] = useState({
    llmAvailable: null,
    mode: null,
    operatorHint: null,
  });
  const [blogGenHint, setBlogGenHint] = useState(null);
  const [blogGenHintIsAuth, setBlogGenHintIsAuth] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
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
    setLoadingOverlay({
      active: false,
      channel: "blog",
      complete: false,
      stepLabel: null,
      startedAt: null,
      estimatedMs: null,
      sensitiveIndustry: false,
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
    if (!loadingOverlay.active) return undefined;
    const id = window.setTimeout(dismissLoadingOverlay, 90_000);
    return () => window.clearTimeout(id);
  }, [loadingOverlay.active, dismissLoadingOverlay]);

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
        quietSuccess = false,
      } = {}
    ) => {
      clearOverlayFinishTimers();
      if (channel === "blog" || channel === "pipeline") {
        if (success) {
          setBlogGenHint(null);
          setBlogGenHintIsAuth(false);
        } else {
          setBlogGenHint(message || null);
          setBlogGenHintIsAuth(
            hintIsAuth ||
              (Boolean(message) &&
                /로그인|인증|세션|한도/.test(String(message)))
          );
        }
      }
      if (!success) {
        dismissLoadingOverlay();
        if (message) onToast?.(message, "error");
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
    const today = new Date().toISOString().slice(0, 10);
    if (draft) {
      const merged = {
        ...DEFAULT_BLOG_INPUT,
        ...draft,
        contentDate: draft.contentDate || today,
      };
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
      if (prev.brandId !== brandId) return prev;
      if (
        prev.brandName?.trim() === brand.brandName?.trim() &&
        prev.region?.trim()
      ) {
        return prev;
      }
      const seeded = brandMemoryToFormInput(brand);
      const merged = {
        ...seeded,
        ...prev,
        brandId,
        brandName: brand.brandName?.trim() || prev.brandName,
        region: prev.region?.trim() || seeded.region,
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
  }, []);

  const resetToHome = useCallback(() => {
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
    trackContentEvent({
      eventType: "save",
      brandId: brandHooks?.activeBrandId,
      contentItemId: memoryContentIds.blog,
      channel: "blog",
    });
    onToast?.("검수본이 저장되었습니다.", "success");
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

  const requireEmailVerified = useCallback(
    ({ setHint = false } = {}) => {
      if (!user || isEmailVerified(user)) return true;
      if (setHint) {
        setBlogGenHint(EMAIL_VERIFY_USER_MESSAGE);
        setBlogGenHintIsAuth(true);
      }
      onToast?.(EMAIL_VERIFY_USER_MESSAGE, "info");
      return false;
    },
    [user, onToast]
  );

  const generateBlog = useCallback((inputOverride, genOpts = {}) => {
    if (blogGenLock.current || generating.blog) {
      onToast?.("이미 생성 중입니다. 잠시만 기다려 주세요.", "info");
      return;
    }
    if (!requireEmailVerified({ setHint: true })) return;
    const input = inputOverride
      ? { ...DEFAULT_BLOG_INPUT, ...blogInput, ...inputOverride }
      : blogInput;
    const errors = validateForm(input);
    if (Object.keys(errors).length > 0) {
      onToast?.(errors[Object.values(errors)[0]], "error");
      return;
    }
    if (input.researchEnabled && !String(input.researchQuery || "").trim()) {
      onToast?.("자료조사를 켠 경우 연구 주제를 입력해 주세요.", "error");
      return;
    }

    const runChannelPack =
      genOpts.blogOnly === false ||
      (genOpts.blogOnly !== true && isAutoPipelineAfterBlog());

    blogGenLock.current = true;
    setBlogGenHint(null);
    setBlogGenHintIsAuth(false);
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    const overlayChannel = runChannelPack ? "pipeline" : "blog";
    const estimatedMs = estimateBlogGenerationMs(input, {
      blogOnly: !runChannelPack,
    });
    const setPipelineStep = (stepLabel) =>
      setLoadingOverlay((prev) => ({
        ...prev,
        active: true,
        channel: overlayChannel,
        complete: false,
        stepLabel,
        startedAt: prev.startedAt ?? startedAt,
        estimatedMs: prev.estimatedMs ?? estimatedMs,
      }));

    flushSync(() => {
      setLoadingOverlay({
        active: true,
        channel: overlayChannel,
        complete: false,
        stepLabel: "준비 중…",
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
        if (input.researchEnabled && input.researchQuery?.trim()) {
          setPipelineStep("자료조사 중...");
          try {
            const researchRes = await generateResearchAsync({
              ...pipelineInput,
              researchQuery: input.researchQuery.trim(),
              researchTypes: input.researchTypes || [],
            });
            if (researchRes?.research) {
              setResearchResult(researchRes.research);
              const brief = buildResearchBrief(researchRes.research, {
                query: input.researchQuery.trim(),
                types: input.researchTypes || [],
              });
              researchStorage = serializeResearchForStorage(
                input.researchQuery.trim(),
                researchRes.research,
                input.researchTypes || []
              );
              pipelineInput.researchBrief = brief;
              pipelineInput.researchPayload = researchStorage;
            }
          } catch (researchErr) {
            blogGenLock.current = false;
            setGenerationSessionActive(false);
            setGenerating((g) => ({ ...g, blog: false }));
            finishLoadingOverlay("blog", startedAt, {
              success: false,
              message:
                researchErr?.message || "자료조사에 실패했습니다.",
            });
            return;
          }
        } else {
          setResearchResult(null);
        }

        setPipelineStep("검색 의도 분석 중...");
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
        setPipelineStep("블로그 작성 중...");
        const [result, ensuredBrand] = await Promise.all([
          generateBlogPipelineAsync(pipelineInput),
          brandEnsureTask,
        ]);
        if (ensuredBrand?.id) {
          pipelineInput.brandId = ensuredBrand.id;
          pipelineInput.brandMemory = ensuredBrand;
        }
        if (result.blogContent) {
          setPipelineStep("콘텐츠 품질 검수 중…");
        }
        if (result.personalization) {
          personalizationRef.current = result.personalization;
        }
        if (sensitive.isSensitive) {
          setPipelineStep(SENSITIVE_VERIFY_STEP.text);
        }
        if (!result.blogContent) {
          finishLoadingOverlay("blog", startedAt, {
            success: false,
            message:
              result.mode === "brief_only"
                ? result.userMessage || LLM_USER_MESSAGES.engineNotConnected
                : result.userMessage || LLM_USER_MESSAGES.qualityWithheld,
          });
          return;
        }
        let blog = result.blogContent;
        if (!blog) {
          finishLoadingOverlay("blog", startedAt, {
            success: false,
            message:
              result.userMessage || LLM_USER_MESSAGES.engineNotConnected,
          });
          return;
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
        isFullBlog = result.mode === "llm" && !blog._meta?.isBriefOnly;

        const deliverBlogResult = () => {
          flushSync(() => {
            setBlogContent(blog);
            setBaseContentLabel(result.baseContentLabel);
            setSourceChannel(
              blogDerive?.sourceChannel && blogDerive.sourceChannel !== "blog"
                ? blogDerive.sourceChannel
                : "blog"
            );
            clearDerived();
            setGenerating((g) => ({ ...g, blog: false }));
          });
          overlaySuccess = true;
          blogGenLock.current = false;
          setGenerationSessionActive(false);
          finishLoadingOverlay(overlayChannel, startedAt, {
            success: true,
            immediate: true,
            quietSuccess: true,
          });
        };

        deliverBlogResult();

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
            "플레이스·인스타도 같은 글 기준으로 만들 수 있어요. 왼쪽 「플레이스·인스타도 함께」를 켜 보세요.",
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
          const derivedInput = {
            ...input,
            userWritingBrief: p?.userBrief,
            brandFeedbackBrief: p?.feedbackBrief,
            styleContinuityBrief: p?.styleContinuityBrief,
            brandKnowledgeBrief: p?.brandKnowledgeBrief,
            personalizationAddon: p?.combinedPromptAddon,
            combinedPersonalizationAddon: p?.combinedPromptAddon,
          };

          if (
            runChannelPack &&
            isFullBlog &&
            llmStatus.llmAvailable !== false
          ) {
            try {
              if (!allowPipelineChannel("instagram")) throw new Error("SKIP_CHANNEL");
              setGenerating((g) => ({ ...g, instagram: true }));
              const insta = runInstagramPipeline(
                derivedInput,
                blog,
                instaTone,
                result.baseContentLabel
              );
              insta._initialPlain = insta.lineBreakBody || insta.body || "";
              setInstagramContent(insta);
              savedInsta = insta;
              brandHooks?.onChannelSaved?.("insta", insta);
            } catch (err) {
              if (err?.message !== "SKIP_CHANNEL") {
                onToast?.(
                  err?.message ||
                    BACKGROUND_OPS.channelFailed("인스타그램"),
                  "info"
                );
              }
            } finally {
              setGenerating((g) => ({ ...g, instagram: false }));
            }

            if (!allowPipelineChannel("place")) {
              maybeChannelUpgradeHint();
            }
            try {
              if (!allowPipelineChannel("place")) throw new Error("SKIP_CHANNEL");
              setGenerating((g) => ({ ...g, place: true }));
              const place = runPlacePipeline(
                derivedInput,
                blog,
                result.baseContentLabel
              );
              place._initialPlain = [place.title, place.shortNotice, place.detailBody]
                .filter(Boolean)
                .join("\n");
              setPlaceContent(place);
              savedPlace = place;
              brandHooks?.onChannelSaved?.("place", place);
            } catch (err) {
              if (err?.message !== "SKIP_CHANNEL") {
                onToast?.(
                  err?.message ||
                    BACKGROUND_OPS.channelFailed("스마트플레이스"),
                  "info"
                );
              }
            } finally {
              setGenerating((g) => ({ ...g, place: false }));
            }

            if (AUTO_RUN_PROMPT_ON_BLOG) {
              try {
                if (!allowPipelineChannel("image")) throw new Error("SKIP_CHANNEL");
                setGenerating((g) => ({ ...g, image: true }));
                const { options: imgOpts } = buildImageGenerationContext(
                  { sourceChannel: "blog", standalone: false },
                  { imageOptions, blogContent: blog, blogInput: input }
                );
                const pack = runImagePipeline(
                  input,
                  blog,
                  imgOpts,
                  result.baseContentLabel
                );
                const imageState = {
                  ...pack,
                  engineStatus: "preparing",
                  activePrompt:
                    pack.thumbnailPrompt || pack[imgOpts.purpose] || "",
                };
                setImagePrompts(imageState);
                savedImagePrompt = imageState.activePrompt || "";
              } catch (err) {
                if (err?.message !== "SKIP_CHANNEL") {
                  onToast?.(
                    err?.message ||
                      BACKGROUND_OPS.channelFailed("비주얼 프롬프트"),
                    "info"
                  );
                }
              } finally {
                setGenerating((g) => ({ ...g, image: false }));
              }
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
              const memSaved = await persistPipelineToMemory({
                brandId: pipelineInput.brandId,
                blog,
                place: savedPlace,
                instagram: savedInsta,
                meta: memMeta,
              });
              setMemoryContentIds((prev) => {
                const next = { ...prev };
                for (const item of memSaved || []) {
                  if (item?.channel && item?.id) next[item.channel] = item.id;
                }
                return next;
              });
            } catch (err) {
              onToast?.(
                err?.message
                  ? `저장: ${err.message}`
                  : BACKGROUND_OPS.saveFailed,
                "info"
              );
            }
          }
        };

        void runPostBlogTail();
      } catch (err) {
        const msg =
          err?.status === 401
            ? "로그인이 필요합니다. 다시 로그인한 뒤 이야기 쓰기를 눌러 주세요."
            : err?.status === 429
              ? err?.message || "이번 달 사용 한도에 도달했습니다."
              : err?.message || "블로그 생성 중 오류가 발생했습니다.";
        onToast?.(msg, err?.status === 429 ? "info" : "error");
        finishLoadingOverlay("blog", startedAt, {
          success: false,
          message: msg,
          hintIsAuth: err?.status === 401 || err?.status === 403,
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
        const saved = await persistPipelineToMemory({
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
      } catch {
        /* memory schema optional */
      }
    },
    [demoMode, brandHooks?.activeBrandId, memoryContentIds, buildMemMeta]
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
      if (blogContent._meta?.isBriefOnly || llmStatus.llmAvailable === false) {
        onToast?.(LLM_USER_MESSAGES.rewriteBlocked, "info");
        return null;
      }
      const isFeedbackFlow = options.source === "feedback";
      const tagIds = options.tagIds || [];
      const inputPatch = options.inputPatch || {};
      const effectiveInput = { ...blogInput, ...inputPatch };
      if (Object.keys(inputPatch).length > 0) {
        setBlogInput((prev) => ({ ...prev, ...inputPatch }));
      }

      const startedAt = Date.now();
      const setFeedbackStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: "feedback",
          complete: false,
          stepLabel,
        });

      if (isFeedbackFlow) {
        void unlockAudioFromUserGesture().then(() => {
          setFeedbackStep(FEEDBACK_REWRITE_STEPS[0].text);
        });
      }

      const ctx = buildRewriteCtx();
      const result = runRewrite(
        "blog",
        blogContent,
        feedbackText,
        {
          ...ctx,
          input: normalizePipelineInput(effectiveInput),
        },
        scope,
        tagIds
      );
      const next = { ...result.pack, _edited: true };
      if (isFeedbackFlow) {
        setFeedbackStep(FEEDBACK_REWRITE_STEPS[1].text);
      }
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
        !isFeedbackFlow &&
        options.deriveChannels === true &&
        !next._meta?.isBriefOnly &&
        (genMode === "llm" || genMode.startsWith("llm_")) &&
        llmStatus.llmAvailable !== false;

      if (!canDerive) {
        if (isFeedbackFlow) {
          finishLoadingOverlay("feedback", startedAt, {
            success: true,
            message: "피드백이 반영되었습니다.",
          });
        } else {
          onToast?.("피드백이 반영되었습니다.", "success");
        }
        return result;
      }

      const setPipelineStep = (stepLabel) =>
        setLoadingOverlay({
          active: true,
          channel: isFeedbackFlow ? "feedback" : "pipeline",
          complete: false,
          stepLabel,
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
      const ensured = ensureChannelGenerateInput(
        base,
        brandHooks?.activeBrand
      );
      if (!inputOverride && ensured.changed) setBlogInput(ensured.values);
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
    if (!source) {
      onToast?.("주제·브랜드명을 입력한 뒤 생성해 주세요.", "error");
      return;
    }
    if (
      source.sourceChannel === "blog" &&
      blogContent &&
      (blogContent._meta?.isBriefOnly || llmStatus.llmAvailable === false)
    ) {
      onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
      return;
    }
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    void unlockAudioFromUserGesture().then(() => {
      setLoadingOverlay({ active: true, channel: "place", complete: false });
    });
    setGenerating((g) => ({ ...g, place: true }));
    setTimeout(() => {
      try {
        let place;
        if (source.standalone) {
          place = runPlaceStandalone(formValues);
        } else {
          place = runPlacePipeline(
            formValues,
            source.blogLike || blogContent,
            source.baseLabel
          );
        }
        place._initialPlain = [place.title, place.shortNotice, place.detailBody]
          .filter(Boolean)
          .join("\n");
        setPlaceContent(place);
        setBaseContentLabel(source.baseLabel);
        setSourceChannel(source.standalone ? "place" : source.sourceChannel);
        brandHooks?.onChannelSaved?.("place", place);
        persistChannelMemory("place", place);
        recordGenerationSignal(brandHooks?.activeBrandId, "place", {
          title: place?.title,
        });
      } catch (err) {
        onToast?.(err?.message || "플레이스 소개글 만들기 실패", "error");
      } finally {
        setGenerating((g) => ({ ...g, place: false }));
        setGenerationSessionActive(false);
        finishLoadingOverlay("place", startedAt);
      }
    }, GENERATION_DELAY_MS);
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
    persistChannelMemory,
    allowPipelineChannel,
    prepareChannelForm,
    commitChannelFormFromOpts,
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
    if (!source) {
      onToast?.("주제·브랜드명을 입력한 뒤 만들어 주세요.", "error");
      return;
    }
    if (
      source.sourceChannel === "blog" &&
      blogContent &&
      (blogContent._meta?.isBriefOnly || llmStatus.llmAvailable === false)
    ) {
      onToast?.(LLM_USER_MESSAGES.placeBlocked, "info");
      return;
    }
    setGenerationSessionActive(true);
    const startedAt = Date.now();
    void unlockAudioFromUserGesture().then(() => {
      setLoadingOverlay({ active: true, channel: "instagram", complete: false });
    });
    setGenerating((g) => ({ ...g, instagram: true }));
    setTimeout(() => {
      try {
        let insta;
        if (source.standalone) {
          insta = runInstagramStandalone(formValues, tone);
        } else {
          insta = runInstagramPipeline(
            formValues,
            source.blogLike || blogContent,
            tone,
            source.baseLabel
          );
        }
        insta._initialPlain = insta.lineBreakBody || insta.body || "";
        setInstagramContent(insta);
        setBaseContentLabel(source.baseLabel);
        setSourceChannel(source.standalone ? "instagram" : source.sourceChannel);
        brandHooks?.onChannelSaved?.("insta", insta);
        persistChannelMemory("instagram", insta);
        recordGenerationSignal(brandHooks?.activeBrandId, "instagram", {
          hook: insta?.hook,
        });
      } catch (err) {
        onToast?.(err?.message || "인스타 캡션 만들기 실패", "error");
      } finally {
        setGenerating((g) => ({ ...g, instagram: false }));
        setGenerationSessionActive(false);
        finishLoadingOverlay("instagram", startedAt);
      }
    }, GENERATION_DELAY_MS);
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
    persistChannelMemory,
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
    setGenerating((g) => ({ ...g, image: true }));
    setTimeout(() => {
      try {
        const { options: imgOpts } = buildImageGenerationContext(source, {
          imageOptions: imgOptsBase,
          blogContent,
          placeContent,
          instagramContent,
          blogInput: formValues,
        });
        setImageOptions(imgOpts);
        const pack = source.standalone
          ? runImageStandalone(formValues, imgOpts)
          : runImagePipeline(
              formValues,
              source.blogLike,
              imgOpts,
              source.baseLabel
            );
        const promptKey =
          {
            thumbnail: "thumbnailPrompt",
            place: "placeImagePrompt",
            insta: "instagramCardPrompt",
            banner: "bannerPrompt",
          }[imgOpts.purpose] || "thumbnailPrompt";
        setImagePrompts({
          ...pack,
          engineStatus: "preparing",
          activePrompt: pack[promptKey] || pack.thumbnailPrompt || "",
        });
        setBaseContentLabel(source.baseLabel);
        setSourceChannel(source.sourceChannel);
      } catch (err) {
        onToast?.(err?.message || "이미지 프롬프트 생성 실패", "error");
      } finally {
        setGenerating((g) => ({ ...g, image: false }));
        setGenerationSessionActive(false);
        finishLoadingOverlay("image", startedAt);
      }
    }, GENERATION_DELAY_MS);
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
    allowPipelineChannel,
    prepareChannelForm,
    commitChannelFormFromOpts,
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

  const formValue = useMemo(
    () => ({
      blogInput,
      setBlogInput: setBlogInputValidated,
      formErrors,
      touched,
      setTouched,
      isFormValid: formReady,
    }),
    [
      blogInput,
      setBlogInputValidated,
      formErrors,
      touched,
      formReady,
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
      clearDerived,
      resetToHome,
      getSnapshot,
      demoMode,
      user,
      brandHooks,
      memoryContentIds,
      billingPlanId,
      billingBypassQuotas,
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
