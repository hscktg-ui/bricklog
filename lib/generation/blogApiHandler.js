/**
 * /api/content/blog 공통 생성 핸들러 — 동기·async run 공유
 */
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { prepareBrandFirstInput } from "@/lib/memory/brandFirstPrewriteGate";
import { mapServiceError } from "@/lib/errors/serviceMessages";
import {
  buildDeliverableBlogFallback,
  enrichMinimalBlogInput,
} from "@/lib/llm/blogDeliveryFallback";
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
import { isBriclogFastPipelineEnabled } from "@/lib/config/briclogFastPipeline";
import { finalizeGpt55BlogPackForUi } from "@/lib/product/gpt55LightDelivery";
import { isWriterFirstRescueBlocked } from "@/lib/product/writerFirstDelivery";
import {
  incrementContentUsage,
  getUsageSummary,
} from "@/lib/billing/usageLedger";
import { logError } from "@/lib/api/logEvent";
import {
  generateVisitReviewSovereignPack,
  isVisitReviewSovereignEligible,
  upgradeVisitReviewPackViaSovereign,
} from "@/lib/product/visitReviewSovereignEngine";
import {
  generateColumnistSovereignPack,
  isColumnistSovereignEligible,
  isColumnistSovereignEnabled,
  upgradePackViaColumnistSovereign,
} from "@/lib/product/columnistSovereignEngine";
import { assertColumnistDeliveryLaw, buildColumnistWithholdMessage } from "@/lib/product/columnistDeliveryLaw";
import { resolveVisitReviewIntentInput } from "@/lib/content/topicFacetEngine";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";

/**
 * @param {object} auth requireVerifiedUser result
 * @param {object} rawInput request body
 * @param {object} [opts]
 */
export async function runBlogApiGeneration(auth, rawInput, opts = {}) {
  const route = opts.route || "/api/content/blog";
  let savedInput = {};
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
    const hydratedInput = attachServerTrendSnapshot(axisReady.input);

    const rawResult = await generateBlogWithLLMFirst(hydratedInput);
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

    const columnistInput = resolveVisitReviewIntentInput(
      hydratedInput,
      result.blogContent
    );
    if (isColumnistSovereignEnabled() && isColumnistSovereignEligible(columnistInput, result.blogContent)) {
      if (result.blogContent?.sections?.length) {
        const upgraded = await upgradePackViaColumnistSovereign(
          result.blogContent,
          columnistInput
        );
        if (upgraded?.sections?.length) {
          result = {
            ...result,
            ok: true,
            withheld: false,
            softPass: false,
            userMessage: null,
            blogContent: finalizeGpt55BlogPackForUi(upgraded, hydratedInput),
            mode: upgraded._meta?.generationMode || "columnist_sovereign",
            meta: {
              ...(result.meta || {}),
              columnistSovereign: true,
              visitReviewSovereign: upgraded._meta?.generationMode === "visit_review_sovereign",
              generationMode: upgraded._meta?.generationMode || "columnist_sovereign",
              passOutput: true,
            },
          };
        }
      } else if (
        hasFilledBlogAxes(hydratedInput) &&
        hasUsableResearchFacts(hydratedInput) &&
        (!result?.blogContent?.sections?.length || result.withheld) &&
        !isWriterFirstRescueBlocked(hydratedInput)
      ) {
        const fresh = await generateColumnistSovereignPack(columnistInput);
        if (fresh?.sections?.length) {
          result = {
            ok: true,
            withheld: false,
            softPass: false,
            userMessage: null,
            blogContent: finalizeGpt55BlogPackForUi(fresh, hydratedInput),
            mode: "columnist_sovereign",
            meta: attachContentQualityToApiMeta(
              {
                columnistSovereign: true,
                generationMode: "columnist_sovereign",
                passOutput: true,
              },
              fresh
            ),
          };
        }
      }
    } else if (isVisitReviewSovereignEligible(columnistInput, result.blogContent)) {
      if (result.blogContent?.sections?.length) {
        const upgraded = await upgradeVisitReviewPackViaSovereign(
          result.blogContent,
          columnistInput
        );
        if (upgraded?.sections?.length) {
          result = {
            ...result,
            ok: true,
            withheld: false,
            softPass: false,
            userMessage: null,
            blogContent: finalizeGpt55BlogPackForUi(upgraded, hydratedInput),
            mode: "visit_review_sovereign",
            meta: {
              ...(result.meta || {}),
              visitReviewSovereign: true,
              generationMode: "visit_review_sovereign",
              passOutput: true,
            },
          };
        }
      } else if (
        hasFilledBlogAxes(hydratedInput) &&
        (!result?.blogContent?.sections?.length || result.withheld) &&
        !isWriterFirstRescueBlocked(hydratedInput)
      ) {
        const fresh = await generateVisitReviewSovereignPack(columnistInput);
        if (fresh?.sections?.length) {
          result = {
            ok: true,
            withheld: false,
            softPass: false,
            userMessage: null,
            blogContent: finalizeGpt55BlogPackForUi(fresh, hydratedInput),
            mode: "visit_review_sovereign",
            meta: attachContentQualityToApiMeta(
              {
                visitReviewSovereign: true,
                generationMode: "visit_review_sovereign",
                passOutput: true,
              },
              fresh
            ),
          };
        }
      }
    }

    if (
      hasFilledBlogAxes(hydratedInput) &&
      (!result?.blogContent?.sections?.length || result.withheld) &&
      !isWriterFirstRescueBlocked(hydratedInput) &&
      !isColumnistSovereignEligible(columnistInput, result.blogContent) &&
      !isVisitReviewSovereignEligible(columnistInput, result.blogContent)
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

    if (result.blogContent?.sections?.length && !result.withheld) {
      const law = assertColumnistDeliveryLaw(result.blogContent, columnistInput);
      if (law.shouldWithhold && isColumnistSovereignEnabled()) {
        const retry = await upgradePackViaColumnistSovereign(result.blogContent, {
          ...columnistInput,
          forceColumnistSovereignFresh: true,
        });
        if (retry?.sections?.length) {
          result = {
            ...result,
            ok: true,
            withheld: false,
            blogContent: finalizeGpt55BlogPackForUi(retry, hydratedInput),
            mode: "columnist_sovereign",
            meta: {
              ...(result.meta || {}),
              columnistSovereign: true,
              generationMode: "columnist_sovereign",
              passOutput: true,
            },
          };
        } else {
          result = {
            ...result,
            withheld: true,
            softPass: false,
            userMessage: buildColumnistWithholdMessage(columnistInput),
            meta: {
              ...(result.meta || {}),
              columnistDeliveryLawBlocked: true,
              withholdReason: law.reason,
            },
          };
        }
      }
    }

    if (
      result.ok !== false &&
      !result.withheld &&
      result.blogContent &&
      result.mode === "llm" &&
      (result.meta?.v2PipelineVerified || result.meta?.v3PipelineVerified)
    ) {
      await incrementContentUsage(auth.supabase, auth.user.id);
    }

    const usageAfter = await getUsageSummary(
      auth.supabase,
      auth.user.id,
      auth.user.email
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
      const enriched = enrichMinimalBlogInput({
        ...slimBlogApiPayload(savedInput),
        v2PipelineEnforced: true,
        v3EngineEnforced: true,
        betaTestGuardEnforced: true,
      });
      const { pack } = buildDeliverableBlogFallback({
        input: enriched,
        prep: { ok: false, reason: "server_error" },
        failures: ["server_error"],
      });
      const blocked = blockUnverifiedBlogApiResponse(
        {
          ok: false,
          mode: "server_error",
          llmAvailable: false,
          blogContent: pack,
        },
        enriched
      );
      return {
        status: 200,
        body: {
          ...blocked,
          userDetail: mapServiceError("ai_generate"),
          baseContentLabel: null,
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
