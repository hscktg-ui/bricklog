/**
 * 생성 후 필수 품질 검수 루프 — RESET: Safe Edit 우선, 90점 미만만 LLM 수정
 */
import {
  CQREVIEW_MAX_REVISIONS,
  CQREVIEW_THRESHOLD,
} from "@/lib/quality/contentQualityReviewConstants";
import {
  runContentQualityReview,
  applyContentQualityRevision,
} from "@/lib/llm/runContentQualityReview";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import { assessBriclogResetQualityGate, BRICLOG_RESET_PASS_SCORE } from "@/lib/product/briclogResetQualityGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

/**
 * @param {object} pack blog pack
 * @param {object} ctx prompt context
 * @param {object} [opts]
 * @returns {Promise<{ pack: object, review: object, revisionCount: number }>}
 */
export async function runContentQualityReviewPipeline(
  pack,
  ctx,
  opts = {}
) {
  if (!pack?.sections?.length) {
    return { pack, review: null, revisionCount: 0 };
  }

  const extras = {
    placeContent: opts.placeContent,
    instagramContent: opts.instagramContent,
  };
  const input = opts.input || {};
  const threshold = isBriclogResetQualityEnforced()
    ? BRICLOG_RESET_PASS_SCORE
    : CQREVIEW_THRESHOLD;

  let current = pack;
  if (isBriclogResetQualityEnforced()) {
    current = applyGoldenSafeEdit(current, input, { forceApply: true });
    const resetProbe = assessBriclogResetQualityGate(current, input);
    current._meta = {
      ...(current._meta || {}),
      qualityReviewSafeEdit: true,
      resetQualityGate: resetProbe,
    };
  }

  let review = await runContentQualityReview(current, ctx, extras);
  let revisionCount = 0;

  const maxRevisions = isBriclogResetQualityEnforced() ? 2 : CQREVIEW_MAX_REVISIONS;

  while (
    !review.approved &&
    review.finalScore < threshold &&
    revisionCount < maxRevisions
  ) {
    const revised = await applyContentQualityRevision(
      current,
      ctx,
      review,
      input
    );
    if (!revised?.sections?.length) break;
    revisionCount += 1;
    current = {
      ...revised,
      _meta: {
        ...current._meta,
        ...revised._meta,
        qualityReviewRevisions: revisionCount,
      },
    };
    review = await runContentQualityReview(current, ctx, extras);
  }

  review = {
    ...review,
    approved: review.finalScore >= threshold,
    revisionCount,
    threshold,
    safeEditFirst: isBriclogResetQualityEnforced() || undefined,
  };

  current._meta = {
    ...current._meta,
    contentQualityReview: review,
    qualityReviewScore: review.finalScore,
    qualityReviewApproved: review.approved,
    improvementSuggestions: review.improvementSuggestions,
  };

  return { pack: current, review, revisionCount };
}
