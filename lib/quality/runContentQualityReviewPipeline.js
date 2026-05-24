/**
 * 생성 후 필수 품질 검수 루프 — 95점 미만 자동 수정
 */
import {
  CQREVIEW_MAX_REVISIONS,
  CQREVIEW_THRESHOLD,
} from "@/lib/quality/contentQualityReviewConstants";
import {
  runContentQualityReview,
  applyContentQualityRevision,
} from "@/lib/llm/runContentQualityReview";

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

  let current = pack;
  let review = await runContentQualityReview(current, ctx, extras);
  let revisionCount = 0;

  while (
    !review.approved &&
    review.finalScore < CQREVIEW_THRESHOLD &&
    revisionCount < CQREVIEW_MAX_REVISIONS
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
    approved: review.finalScore >= CQREVIEW_THRESHOLD,
    revisionCount,
    threshold: CQREVIEW_THRESHOLD,
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
