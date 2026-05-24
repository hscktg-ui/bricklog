/**
 * STEP 23 — Final Audit Mode (후하게 평가 금지)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { runInternalQualityLoop } from "./internalQualityLoop";
import { detectNoCopyViolations } from "./noCopyPolicy";
import { runFinalSelfReviewUltimate } from "./finalSelfReviewUltimate";

const UPLOAD_READY_MIN = 78;

export function runFinalAudit(pack, ctx = {}, input = {}) {
  const loop = runInternalQualityLoop(pack, ctx, input);
  const review = runFinalSelfReviewUltimate(pack, ctx);
  const noCopy = detectNoCopyViolations(pack, ctx.brandResearch);
  const charCount = countBlogBodyChars(pack);
  const full = getBlogFullText(pack);

  const blockers = [];
  if (pack._meta?.blocked) blockers.push("pipeline_blocked");
  if (!loop.ok) blockers.push("quality_loop");
  if (!review.ok) blockers.push(...review.failures);
  if (!noCopy.ok) blockers.push("no_copy");
  if (charCount < BLOG_MIN_BODY_CHARS) blockers.push("length_under_min");
  if (!full || full.length < 400) blockers.push("empty_body");
  if (loop.qualityScore?.total < UPLOAD_READY_MIN) {
    blockers.push("score_below_upload_ready");
  }

  const uploadReady = blockers.length === 0;

  return {
    ok: uploadReady,
    uploadReady,
    blockers: [...new Set(blockers)],
    loop,
    review,
    noCopy,
    charCount,
    withholdOutput: !uploadReady,
  };
}
