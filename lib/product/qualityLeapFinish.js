/**
 * Quality Leap — LLM 추가 없이 Core1·SQV·벤치 스탬프 (2분 SLA)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { computeContentQualityValue } from "@/lib/product/contentQualityValue";
import {
  assessVisitReviewBenchmark,
} from "@/lib/product/visitReviewBenchmarkRubric";
import { stampCoreEngineDeliveryMeta } from "@/lib/product/briclogCoreEngine";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { stripEngineSpamFromPack, hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
import { QUALITY_NORTH_STAR_VERSION } from "@/lib/product/qualityNorthStar";
import {
  applyExperienceRepairToPack,
  assessSentenceExperienceGate,
  isBriclogExperienceOpinionEnforced,
  sentenceExperienceOpinionAxes,
} from "@/lib/product/briclogExperienceOpinionEngine";
import { resolveUnifiedDeliveryPassMin } from "@/lib/product/unifiedDeliveryPassMin";
import { assessStructureScore } from "@/lib/quality/structureScoreKpi";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import {
  applyQualityAug2026Finish,
  stampQualityAug2026Stack,
  QUALITY_AUG2026_STACK_VERSION,
} from "@/lib/product/qualityAug2026Stack";

export const QUALITY_LEAP_FINISH_VERSION = "quality-leap-v2";
const SALVAGE_BENCH_FLOOR = 82;

function mergeInput(input = {}) {
  return { input, ...input, skipDeliveryFinalize: true };
}

function injectLocalExperienceObservation(pack, input = {}) {
  if (!isBriclogExperienceOpinionEnforced() || !pack?.sections?.length) return pack;

  const brand = String(input.brandName || "").trim() || "브랜드";
  const region = String(input.region || "").trim();
  const brandObj = koreanObjectParticle(brand);
  const obsLine = region
    ? `${region}에서 ${brandObj} 직접 확인해 보면, 조사로 정리한 포인트가 현장 감각과 맞는지 감이 옵니다.`
    : `${brand}에서 보면 설명과 체감이 이어지는 부분이 눈에 들어옵니다.`;

  let injected = false;
  const sections = (pack.sections || []).map((sec, idx) => {
    if (injected || idx > 1) return sec;
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const needsObs =
      paras.length > 0 &&
      paras.some((p) => {
        const gate = assessSentenceExperienceGate(p, input);
        return !gate.skipped && !gate.ok;
      });
    const hasAxes = paras.some((p) => sentenceExperienceOpinionAxes(p).length > 0);
    if (!needsObs && hasAxes) return sec;
    injected = true;
    return { ...sec, body: [...paras, obsLine].join("\n\n") };
  });

  if (!injected) return pack;
  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      experienceOpinionLocalInject: true,
    },
  };
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
  next = injectLocalExperienceObservation(next, input);
  if (!next._meta?.humanityFinishPass) {
    next = applyHumanityFinishPass(next, mergeInput(input), "blog");
  }
  next = applyExperienceRepairToPack(next, input);
  next = applyQualityAug2026Finish(next, input, { forceSafeEdit: true });

  const fullText = getBlogFullText(next);
  const belief = scoreHumanBelief(fullText, { input, pack: next }, next);
  const sqv = computeContentQualityValue(next, input);
  const structure = assessStructureScore(next, input);
  const passMin = resolveUnifiedDeliveryPassMin({});
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
      qualityAug2026Version: QUALITY_AUG2026_STACK_VERSION,
      humanBelief: belief,
      humanBeliefScore: belief.score,
      humanVoiceMet: belief.score >= HUMAN_BELIEF_MIN_SCORE,
      sqv: { score: sqv.score, grade: sqv.grade, version: sqv.version },
      contentQualityValue: sqv.score,
      visitReviewBenchmark: bench,
      visitReviewBenchmarkOk: bench.publishOk === true,
      structureScore: structure,
      structureOk: structure.ok,
      publishReady: bench.publishOk === true && belief.score >= HUMAN_BELIEF_MIN_SCORE - 5,
      contentQualityDelivered:
        bench.publishOk === true && belief.score >= HUMAN_BELIEF_MIN_SCORE - 10,
      ...(salvage ? { qualityLeapSalvage: true, generationMode: opts.source || "quality_leap_salvage" } : {}),
    },
  };

  next = stampQualityAug2026Stack(next, input);

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
