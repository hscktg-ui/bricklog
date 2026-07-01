/**
 * Quality Leap — LLM 추가 없이 Core1·SQV·벤치 스탬프 (2분 SLA)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { computeContentQualityValue } from "@/lib/product/contentQualityValue";
import {
  assessVisitReviewBenchmark,
  resolveVisitReviewPassMin,
} from "@/lib/product/visitReviewBenchmarkRubric";
import { stampCoreEngineDeliveryMeta } from "@/lib/product/briclogCoreEngine";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { stripEngineSpamFromPack, hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
import { QUALITY_NORTH_STAR_VERSION } from "@/lib/product/qualityNorthStar";

export const QUALITY_LEAP_FINISH_VERSION = "quality-leap-v1";
const SALVAGE_BENCH_FLOOR = 82;

function mergeInput(input = {}) {
  return { input, ...input, skipDeliveryFinalize: true };
}

/**
 * Core1·SQV·humanBelief·visitReview 벤치를 팩에 스탬프 (로컬만)
 */
export function applyQualityLeapStamp(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;

  let next = pack;
  if (hasEngineSpamInPack(next)) {
    next = stripEngineSpamFromPack(next);
  }
  if (!next._meta?.humanityFinishPass) {
    next = applyHumanityFinishPass(next, mergeInput(input), "blog");
  }

  const fullText = getBlogFullText(next);
  const belief = scoreHumanBelief(fullText, { input, pack: next }, next);
  const sqv = computeContentQualityValue(next, input);
  const passMin = resolveVisitReviewPassMin({});
  const existingBench = next._meta?.visitReviewBenchmark;
  let bench =
    existingBench?.publishOk === true
      ? existingBench
      : assessVisitReviewBenchmark(next, input, { passMin });

  const salvage = Boolean(opts.salvage);
  if (
    salvage &&
    !bench.publishOk &&
    !bench.hardFails?.length &&
    bench.score >= SALVAGE_BENCH_FLOOR &&
    belief.score >= HUMAN_BELIEF_MIN_SCORE - 5
  ) {
    bench = {
      ...bench,
      publishOk: true,
      grade: bench.score >= 90 ? "A" : bench.score >= passMin ? "A-" : "B+",
    };
  }

  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      qualityLeapFinish: true,
      qualityLeapVersion: QUALITY_LEAP_FINISH_VERSION,
      qualityNorthStar: QUALITY_NORTH_STAR_VERSION,
      humanBelief: belief,
      humanBeliefScore: belief.score,
      humanVoiceMet: belief.score >= HUMAN_BELIEF_MIN_SCORE,
      sqv: { score: sqv.score, grade: sqv.grade, version: sqv.version },
      contentQualityValue: sqv.score,
      visitReviewBenchmark: bench,
      visitReviewBenchmarkOk: bench.publishOk === true,
      publishReady: bench.publishOk === true && belief.score >= HUMAN_BELIEF_MIN_SCORE - 5,
      ...(salvage ? { qualityLeapSalvage: true, generationMode: opts.source || "quality_leap_salvage" } : {}),
    },
  };

  try {
    next = stampCoreEngineDeliveryMeta(next, input, "blog");
  } catch {
    /* optional */
  }
  return next;
}

export function finalizeQualityLeapPack(pack, input = {}, opts = {}) {
  return applyQualityLeapStamp(pack, input, opts);
}
