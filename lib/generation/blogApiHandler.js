/**
 * /api/content/blog 공통 생성 핸들러 — 동기·async run 공유
 */
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { prepareBrandFirstInput } from "@/lib/memory/brandFirstPrewriteGate";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import { blockUnverifiedBlogApiResponse } from "@/lib/content/v2PipelineGate";
import {
  isBrandFirstEngineEnabled,
  isOfficialSourceFirstEnabled,
  isStrictBrandGuardEnabled,
} from "@/lib/config/brandEngineFlags";
import { slimBlogApiPayload } from "@/lib/generation/slimBlogApiPayload";
import {
  attachContentQualityToApiMeta,
  finalizeContentQualityForDelivery,
  hasSubstantiveLlmBody,
  isLlmOriginatedPack,
} from "@/lib/product/contentQualityDelivery";
import { applyWriterEngineIfNeeded } from "@/lib/product/briclogWriterEngine";
import { alignBlogApiDeliveryResponse } from "@/lib/product/blogApiDeliveryGate";
import { buildMissionRescueApiDelivery } from "@/lib/generation/missionRescueDelivery";
import { ensureGenerationAxesOnInput } from "@/lib/workspace/brandFormSync";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { ensureServerAxisResearch } from "@/lib/generation/serverAxisResearch";
import { attachServerTrendSnapshot } from "@/lib/trends/serverTrendHints";
import {
  isBriclogFastPipelineEnabled,
  shouldUseColumnistFirstFastPath,
  isCustomerTwoMinuteSlaMode,
  getColumnistSlaApiRetries,
  shouldUseColumnistSlaSlowFallback,
  getOpenAiRateLimitRetryDelayMs,
} from "@/lib/config/briclogFastPipeline";
import { finalizeGpt55BlogPackForUi } from "@/lib/product/gpt55LightDelivery";
import { isWriterFirstRescueBlocked } from "@/lib/product/writerFirstDelivery";
import {
  incrementContentUsage,
  getUsageSummary,
} from "@/lib/billing/usageLedger";
import { logError } from "@/lib/api/logEvent";
import {
  applyColumnistSovereignApiDelivery,
  generateColumnistSovereignPack,
  isColumnistSovereignEligible,
  isColumnistSovereignEnabled,
  takeColumnistLastFailure,
} from "@/lib/product/columnistSovereignEngine";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import {
  buildTopicMemoryEntry,
  persistBrandTopicMemory,
} from "@/lib/memory/brandTopicMemory";
import { resolveVisitReviewIntentInput } from "@/lib/content/topicFacetEngine";
import { evaluateEditorGradeResearchGate } from "@/lib/product/editorGradeResearchGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { sanitizeGenerationInputResearch } from "@/lib/content/researchFactSanitize";
import { applyGenerationAxisAlignHints, assessGenerationAxisAlignment } from "@/lib/product/generationAxisAlignGate";
import { UNEDITED_PUBLISH_WITHHOLD_MESSAGE, OPENAI_QUOTA_USER_MESSAGE, OPENAI_RATE_LIMIT_USER_MESSAGE } from "@/lib/product/uneditedPublishGradeGate";
import {
  runResearchFirstPipeline,
  stampResearchFirstOnInput,
} from "@/lib/product/briclogResearchFirstPipeline";
import { attachDeliveryValueToBlogResult } from "@/lib/product/deliveryValueExposure";

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} auth requireVerifiedUser result
 * @param {object} rawInput request body
 * @param {object} [opts]
 */
export async function runBlogApiGeneration(auth, rawInput, opts = {}) {
  const route = opts.route || "/api/content/blog";
  let savedInput = {};
  let researchFirstDossier = null;
  try {
    const input = ensureGenerationAxesOnInput(slimBlogApiPayload(rawInput));
    savedInput = input;
    input.billingPlan = opts.planId || "free";

    const prepared = await prepareBrandFirstInput({
      supabase: auth.supabase,
      userId: auth.user.id,
      input,
    });
    if (!prepared.ok) {
      return {
        status: 422,
        body: {
          ok: false,
          mode: "brand_memory_gate",
          userMessage: prepared.userMessage,
        },
      };
    }

    const personalization = prepared.personalization;
    const requestInput = prepared.input;
    requestInput.v2AxisRequired = requestInput.v2AxisRequired !== false;
    requestInput.v2PipelineEnforced = true;
    requestInput.v3EngineEnforced = true;
    requestInput.betaTestGuardEnforced = true;

    const axisReady = await ensureServerAxisResearch(requestInput);
    if (!axisReady.ok) {
      return {
        status: 422,
        body: {
          ok: false,
          mode: "research_gate",
          withheld: true,
          userMessage: axisReady.userMessage,
          meta: { failReasons: axisReady.reasons || [] },
        },
      };
    }
    const hydratedInput = attachServerTrendSnapshot(
      sanitizeGenerationInputResearch(applyGenerationAxisAlignHints(axisReady.input))
    );
    researchFirstDossier = runResearchFirstPipeline(hydratedInput);
    const inputWithDossier = stampResearchFirstOnInput(hydratedInput, researchFirstDossier);
    Object.assign(hydratedInput, inputWithDossier);

    const axisAlign = assessGenerationAxisAlignment(hydratedInput);
    if (!axisAlign.ok) {
      return {
        status: 422,
        body: {
          ok: false,
          mode: "axis_align_blocked",
          withheld: true,
          userMessage:
            axisAlign.hints?.[0] ||
            "브랜드·지역·주제가 서로 맞지 않아요. 주제를 이 브랜드에 맞게 수정해 주세요.",
          meta: {
            failReasons: [axisAlign.reason],
            axisAlignHints: axisAlign.hints,
          },
        },
      };
    }

    let rawResult = null;
    const columnistFirst =
      isColumnistSovereignEnabled() &&
      isColumnistSovereignEligible(hydratedInput) &&
      shouldUseColumnistFirstFastPath(hydratedInput);

    if (isBriclogResetQualityEnforced()) {
      const editorResearchGate = evaluateEditorGradeResearchGate(hydratedInput);
      if (!editorResearchGate.ok) {
        return {
          status: 422,
          body: {
            ok: false,
            mode: "research_density_gate",
            withheld: true,
            userMessage: editorResearchGate.userMessage,
            meta: {
              substantiveFactCount: editorResearchGate.substantiveCount,
              minRequired: editorResearchGate.minRequired,
            },
          },
        };
      }
    }

    if (columnistFirst) {
      let sovereignPack = await generateColumnistSovereignPack({
        ...hydratedInput,
        columnistFastDelivery: true,
      });
      let columnistSlowFallback = false;
      let columnistFailDiagnostic = takeColumnistLastFailure();
      const isOpenAiThrottle = (d) =>
        d?.code === "openai_quota" || d?.code === "openai_rate_limit";

      if (!sovereignPack?.sections?.length && !isOpenAiThrottle(columnistFailDiagnostic)) {
        if (isCustomerTwoMinuteSlaMode()) {
          const slaRetries = getColumnistSlaApiRetries();
          for (let attempt = 0; attempt < slaRetries && !sovereignPack?.sections?.length; attempt += 1) {
            if (
              columnistFailDiagnostic?.code === "openai_rate_limit" &&
              getOpenAiRateLimitRetryDelayMs() > 0
            ) {
              await sleepMs(getOpenAiRateLimitRetryDelayMs());
            }
            sovereignPack = await generateColumnistSovereignPack({
              ...hydratedInput,
              columnistFastDelivery: true,
              forceColumnistSovereignFresh: true,
              regenDeliveryPolish: true,
            });
            columnistFailDiagnostic = takeColumnistLastFailure();
            if (isOpenAiThrottle(columnistFailDiagnostic)) break;
          }
          if (
            !sovereignPack?.sections?.length &&
            !isOpenAiThrottle(columnistFailDiagnostic) &&
            shouldUseColumnistSlaSlowFallback()
          ) {
            if (columnistFailDiagnostic?.code === "openai_rate_limit") {
              await sleepMs(getOpenAiRateLimitRetryDelayMs());
            }
            columnistSlowFallback = true;
            sovereignPack = await generateColumnistSovereignPack({
              ...hydratedInput,
              columnistFastDelivery: false,
              columnistForceSlow: true,
              forceColumnistSovereignFresh: true,
            });
            columnistFailDiagnostic = takeColumnistLastFailure();
          }
        } else {
          sovereignPack = await generateColumnistSovereignPack({
            ...hydratedInput,
            columnistFastDelivery: false,
            columnistForceSlow: true,
            forceColumnistSovereignFresh: true,
          });
          columnistFailDiagnostic = takeColumnistLastFailure();
        }
      }
      if (sovereignPack?.sections?.length) {
        rawResult = {
          ok: true,
          withheld: false,
          softPass: false,
          userMessage: null,
          blogContent: finalizeGpt55BlogPackForUi(sovereignPack, hydratedInput),
          mode: "columnist_sovereign",
          meta: {
            columnistSovereign: true,
            columnistFirstFastPath: true,
            columnistSlowFallback,
            generationMode: "columnist_sovereign",
            v2PipelineVerified: true,
            v3PipelineVerified: true,
            passOutput: true,
            serverVerifiedSkipClientReverify: true,
            fastPipelineDelivery: !columnistSlowFallback,
          },
        };
      }
      if (!rawResult) {
        const throttle = isOpenAiThrottle(columnistFailDiagnostic);
        const userMessage = throttle
          ? columnistFailDiagnostic.code === "openai_quota"
            ? OPENAI_QUOTA_USER_MESSAGE
            : OPENAI_RATE_LIMIT_USER_MESSAGE
          : UNEDITED_PUBLISH_WITHHOLD_MESSAGE;
        const mode = throttle
          ? columnistFailDiagnostic.code === "openai_quota"
            ? "openai_quota_exceeded"
            : "openai_rate_limit"
          : "columnist_sovereign_failed";
        return {
          status: throttle ? 503 : 422,
          body: {
            ok: false,
            mode,
            withheld: true,
            userMessage,
            blogContent: { sections: [], title: "", representativeTitle: "" },
            meta: {
              failReasons: [mode],
              columnistFirstFastPath: true,
              columnistSlowFallback,
              columnistFailDiagnostic,
            },
          },
        };
      }
    }

    if (!rawResult) {
      rawResult = await generateBlogWithLLMFirst(hydratedInput);
    }
    let result = blockUnverifiedBlogApiResponse(rawResult, hydratedInput);
    if (
      !result?.blogContent?.sections?.length &&
      hasSubstantiveLlmBody(rawResult?.blogContent, hydratedInput) &&
      isLlmOriginatedPack(rawResult?.blogContent, rawResult)
    ) {
      const rescued = await applyWriterEngineIfNeeded(
        rawResult.blogContent,
        hydratedInput
      );
      result = {
        ...rawResult,
        ok: true,
        withheld: false,
        softPass: false,
        userMessage: null,
        blogContent: finalizeContentQualityForDelivery(
          rescued,
          hydratedInput,
          "blog"
        ),
        meta: attachContentQualityToApiMeta(
          {
            ...(rawResult.meta || {}),
            llmApiInboundRescue: true,
            passOutput: true,
          },
          rescued
        ),
      };
    }
    if (result.blogContent?.sections?.length) {
      const alreadyEscaped = Boolean(
        result.blogContent?._meta?.writerFirstOrchestratorEscape &&
          result.blogContent?._meta?.publishReady
      );
      if (!result.withheld || alreadyEscaped) {
        if (isBriclogFastPipelineEnabled()) {
          const blog = alreadyEscaped
            ? result.blogContent
            : finalizeGpt55BlogPackForUi(result.blogContent, hydratedInput);
          result = {
            ...result,
            ok: true,
            withheld: false,
            softPass: false,
            userMessage: null,
            blogContent: blog,
            meta: {
              ...(result.meta || {}),
              v2PipelineVerified: true,
              v3PipelineVerified: true,
              passOutput: true,
              serverVerifiedSkipClientReverify: true,
              fastPipelineDelivery: true,
              generationMode: result.meta?.generationMode || "llm_fast",
            },
          };
        } else {
          let blog = await applyWriterEngineIfNeeded(
            result.blogContent,
            hydratedInput
          );
          blog = finalizeContentQualityForDelivery(blog, hydratedInput, "blog", {
            afterWriterEngine: true,
          });
          result = { ...result, blogContent: blog };
        }
      }
    }

    if (
      result.mode !== "columnist_sovereign" ||
      !result.blogContent?._meta?.columnistSovereignLlm
    ) {
      result = await applyColumnistSovereignApiDelivery(result, hydratedInput, {
        finalizeForUi: finalizeGpt55BlogPackForUi,
      });
    }

    const columnistInput = resolveVisitReviewIntentInput(
      hydratedInput,
      result.blogContent
    );

    if (
      hasFilledBlogAxes(hydratedInput) &&
      (!result?.blogContent?.sections?.length || result.withheld) &&
      !isWriterFirstRescueBlocked(hydratedInput) &&
      !isColumnistSovereignEligible(columnistInput, result.blogContent) &&
      !hasUsableResearchFacts(hydratedInput)
    ) {
      const rescued = buildMissionRescueApiDelivery(
        hydratedInput,
        { reasons: result.meta?.failReasons || ["api_inbound_rescue"] },
        { mode: "mission_rescue_delivery" }
      );
      if (rescued?.blogContent?.sections?.length) {
        result = rescued;
      }
    }

    result = alignBlogApiDeliveryResponse(result, hydratedInput);

    if (
      result.ok !== false &&
      !result.withheld &&
      result.blogContent?.sections?.length &&
      hydratedInput.brandId
    ) {
      const topicEntry = buildTopicMemoryEntry(hydratedInput, "success");
      if (topicEntry) {
        void persistBrandTopicMemory(
          auth.supabase,
          auth.user.id,
          hydratedInput.brandId,
          topicEntry
        );
      }
    } else if (result.withheld && hydratedInput.brandId) {
      const topicEntry = buildTopicMemoryEntry(hydratedInput, "withhold");
      if (topicEntry) {
        void persistBrandTopicMemory(
          auth.supabase,
          auth.user.id,
          hydratedInput.brandId,
          topicEntry
        );
      }
    }

    if (
      result.ok !== false &&
      !result.withheld &&
      result.blogContent &&
      (result.mode === "llm" ||
        result.mode === "columnist_sovereign" ||
        result.meta?.columnistSovereign) &&
      (result.meta?.v2PipelineVerified || result.meta?.v3PipelineVerified)
    ) {
      await incrementContentUsage(auth.supabase, auth.user.id);
    }

    const usageAfter = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
    );

    result = attachDeliveryValueToBlogResult(
      result,
      hydratedInput,
      researchFirstDossier || hydratedInput.researchFirstDossier
    );

    return {
      status: 200,
      body: {
        ...result,
        meta: attachContentQualityToApiMeta(
          {
            ...(result.meta || {}),
            rolloutFlags: {
              brandFirstEngine: isBrandFirstEngineEnabled(),
              strictBrandGuard: isStrictBrandGuardEnabled(),
              officialSourceFirst: isOfficialSourceFirstEnabled(),
            },
          },
          result.blogContent
        ),
        personalization,
        usageWarning: usageAfter.usageWarning,
        usage: usageAfter,
      },
    };
  } catch (err) {
    console.error(`[${route}]`, err);
    await logError({
      userId: auth.user.id,
      route,
      message: err.message,
      err,
      accessToken: auth.token,
    });
    try {
      return {
        status: 422,
        body: {
          ok: false,
          mode: "server_error",
          withheld: true,
          llmAvailable: false,
          userMessage: UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
          userDetail: mapServiceError("ai_generate"),
          blogContent: { sections: [], title: "", representativeTitle: "" },
          meta: { failReasons: ["server_error"], apiDeliveryAligned: true },
        },
      };
    } catch (fallbackErr) {
      console.error(`[${route}] fallback`, fallbackErr);
      return {
        status: 500,
        body: {
          ok: false,
          mode: "error",
          llmAvailable: false,
          userMessage: mapServiceError("ai_generate"),
          error:
            process.env.NODE_ENV === "development"
              ? String(err.message)
              : undefined,
        },
      };
    }
  }
}
