/**
 * Blog API delivery alignment — pack meta ↔ ok/withheld must match (SSOT).
 * Prevents draft_fallback / sub-90 eval from returning ok:true + withheld:false.
 */
import {
  isBriclogResetQualityEnforced,
  RESET_QUALITY_WITHHOLD_MESSAGE,
} from "@/lib/config/resetLaunchFlags";
import { assertBriclogResetQualityGate } from "@/lib/product/briclogResetQualityGate";
import { attachContentQualityToApiMeta } from "@/lib/product/contentQualityDelivery";
import { isLaunchPublishFirstMode } from "@/lib/config/launchPublishMode";
import { isWriterFirstDeliveryEnabled } from "@/lib/product/writerFirstDelivery";

const RESEARCH_HEAVY_DELIVERY_MODES = new Set([
  "research_heavy_rescue",
  "forced_mission_prose",
  "research_gate_rescue",
  "research_gate_stamped",
  "mission_rescue_delivery",
]);

function isResearchHeavyDeliveryMode(result = {}) {
  const mode = String(
    result.meta?.generationMode || result.mode || ""
  );
  if (RESEARCH_HEAVY_DELIVERY_MODES.has(mode)) return true;
  return Boolean(
    result.meta?.researchHeavyRescue ||
      result.meta?.forcedMissionProseRoute ||
      result.blogContent?._meta?.researchHeavyDelivery
  );
}

/**
 * @param {object} result
 * @param {object} [input]
 * @returns {{ withhold: boolean, reasons?: string[], userMessage?: string|null }}
 */
export function assessBlogApiDeliveryWithhold(result = {}, input = {}) {
  const pack = result?.blogContent;
  if (!pack?.sections?.length) {
    return { withhold: true, reasons: ["empty_pack"] };
  }

  if (isLaunchPublishFirstMode()) {
    return { withhold: false };
  }

  const meta = pack._meta || {};

  if (
    isResearchHeavyDeliveryMode(result) &&
    meta.outputWithheld !== true &&
    meta.resetQualityWithheld !== true &&
    meta.researchHeavyDeliveryOk !== false
  ) {
    return { withhold: false };
  }

  if (meta.outputWithheld === true || meta.resetQualityWithheld === true) {
    return {
      withhold: true,
      reasons: meta.resetQualityGate?.reasons || ["output_withheld"],
      userMessage:
        meta.resetQualityGate?.userMessage ||
        meta.contentEvaluation?.userMessage ||
        null,
    };
  }

  const eval_ = meta.contentEvaluation;
  if (
    isBriclogResetQualityEnforced() &&
    eval_ &&
    (eval_.shouldWithhold === true || eval_.pass === false)
  ) {
    return {
      withhold: true,
      reasons: eval_.reasons || eval_.failReasons || ["content_evaluation_fail"],
      userMessage: eval_.userMessage || null,
    };
  }

  if (result.mode === "draft_fallback" && isBriclogResetQualityEnforced()) {
    if (isResearchHeavyDeliveryMode(result)) {
      return { withhold: false };
    }
    return {
      withhold: true,
      reasons: ["draft_fallback_blocked"],
      userMessage: RESET_QUALITY_WITHHOLD_MESSAGE,
    };
  }

  if (meta.draftFallback === true && isBriclogResetQualityEnforced()) {
    if (isResearchHeavyDeliveryMode(result)) {
      return { withhold: false };
    }
    return {
      withhold: true,
      reasons: ["draft_fallback_meta"],
      userMessage: RESET_QUALITY_WITHHOLD_MESSAGE,
    };
  }

  if (
    isWriterFirstDeliveryEnabled() &&
    meta.publishReady === true &&
    !meta.outputWithheld &&
    (meta.writerFirstDelivery || meta.writerFirstOrchestratorEscape)
  ) {
    const reset = assertBriclogResetQualityGate(pack, input);
    if (!reset.hardFail) {
      return { withhold: false };
    }
  }

  if (isBriclogResetQualityEnforced()) {
    const reset = assertBriclogResetQualityGate(pack, input);
    if (reset.shouldWithhold) {
      return {
        withhold: true,
        reasons: reset.reasons || [],
        userMessage: reset.userMessage,
      };
    }
  }

  return { withhold: false };
}

/**
 * Final API response pass — call after finalizeContentQualityForDelivery.
 * @param {object} result
 * @param {object} [input]
 */
export function alignBlogApiDeliveryResponse(result = {}, input = {}) {
  const check = assessBlogApiDeliveryWithhold(result, input);
  if (!check.withhold) {
    return {
      ...result,
      ok: result.ok !== false,
      withheld: false,
      softPass: false,
    };
  }

  return {
    ...result,
    ok: false,
    withheld: true,
    softPass: false,
    userMessage:
      check.userMessage ||
      result.userMessage ||
      RESET_QUALITY_WITHHOLD_MESSAGE,
    meta: attachContentQualityToApiMeta(
      {
        ...(result.meta || {}),
        failReasons: check.reasons || [],
        apiDeliveryAligned: true,
      },
      result.blogContent
    ),
  };
}
