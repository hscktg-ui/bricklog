/**
 * 작성 후 검수 — 1회 자동 재편집 후 재검수
 */
import {
  assertPostWriteDeliverable,
} from "@/lib/content/v2PipelineGate";
import { deliverBlogDespiteGate } from "@/lib/product/deliverySoftPass";
import { isCompletionHardFailure } from "@/lib/product/completionStandard";
import {
  CUSTOMER_PIPELINE_STEP_LABELS,
  resolveDeliveryFailureMessage,
} from "@/lib/product/customerOutput";
import { salvageBlogPackForDelivery } from "@/lib/generation/postVerifySalvage";

function isLengthGateFailure(reasons = []) {
  return reasons.some(
    (r) => r === "length_tier_under" || r === "length_tier_over"
  );
}

function isHumanBeliefFailure(gate = {}, pack = null, pipelineInput = {}) {
  const reasons = [
    ...(gate.reasons || []),
    ...(gate.failReasons || []),
    ...(pack?._meta?.humanBelief?.failReasons || []),
  ];
  if (
    reasons.includes("human_belief_low") ||
    reasons.includes("grounded_specificity_low")
  ) {
    return true;
  }
  return isCompletionHardFailure(gate, pack, pipelineInput);
}

function applyAutoReedit(pack, pipelineInput) {
  return salvageBlogPackForDelivery(pack, pipelineInput);
}

/**
 * @param {object} pipelineInput
 * @param {object} blogPack
 * @param {{ setPipelineStep?: (label: string) => void, recoverLength?: () => object|null }} hooks
 */
export function runPostVerifyWithAutoRetry(pipelineInput, blogPack, hooks = {}) {
  let current = blogPack;
  const maxAttempts = isHumanBeliefFailure({}, blogPack, pipelineInput) ? 3 : 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      hooks.setPipelineStep?.(CUSTOMER_PIPELINE_STEP_LABELS.retryReview);
      current = applyAutoReedit(current, pipelineInput);
    }

    const post = assertPostWriteDeliverable(pipelineInput, current);
    if (post.ok) {
      return {
        ok: true,
        pack: post.pack,
        post,
        autoRetried: attempt > 0,
      };
    }

    const beliefRetry =
      isHumanBeliefFailure(post, current, pipelineInput) &&
      attempt < maxAttempts - 1;
    if (beliefRetry) {
      current = applyAutoReedit(current, pipelineInput);
      continue;
    }

    if (isLengthGateFailure(post.reasons || []) && hooks.recoverLength) {
      const recovered = hooks.recoverLength();
      if (recovered?.blogContent) {
        current = recovered.blogContent;
        continue;
      }
    }

    if (attempt < maxAttempts - 1) {
      current = salvageBlogPackForDelivery(current, pipelineInput);
      continue;
    }

    const salvaged = salvageBlogPackForDelivery(current, pipelineInput);
    for (const candidate of [salvaged, current]) {
      const preview = deliverBlogDespiteGate(
        pipelineInput,
        candidate,
        post,
        { mode: "post_verify_preview" }
      );
      if (preview) {
        return {
          ok: true,
          pack: preview.blogContent,
          post,
          autoRetried: attempt > 0,
        };
      }
    }

    return {
      ok: false,
      pack: current,
      post,
      userMessage: resolveDeliveryFailureMessage(post),
      autoRetried: attempt > 0,
    };
  }

  return {
    ok: false,
    pack: current,
    userMessage: resolveDeliveryFailureMessage({ ok: false }),
  };
}

export { isLengthGateFailure };
