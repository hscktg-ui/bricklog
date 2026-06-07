/**
 * SQV — Single Quality Value (글 품질값 SSOT)
 * UI·리포트·출고 판정에 하나의 점수·등급을 제공한다.
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { scorePersonaEngineAlignment } from "@/lib/persona/personaEngineProfile";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { assertCompleteBlogPackForDelivery } from "@/lib/product/completeDeliveryGate";
import { assessContentExplainabilityForPublish } from "@/lib/product/briclogContentDoctrine";
import { getBlogFullText } from "@/utils/qualityCheck";

export const SQV_VERSION = "v1";

const WEIGHTS = {
  persona: 0.28,
  humanBelief: 0.22,
  explainability: 0.2,
  completeDelivery: 0.3,
};

function gradeFromScore(score) {
  if (score >= 88) return "A";
  if (score >= 76) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function computeContentQualityValue(pack, input = {}) {
  if (!pack?.sections?.length) {
    return {
      version: SQV_VERSION,
      score: 0,
      grade: "F",
      publishReady: false,
      breakdown: {},
      reasons: ["empty_pack"],
    };
  }

  if (!isBriclogMissionEnforced()) {
    return {
      version: SQV_VERSION,
      score: 100,
      grade: "A",
      publishReady: true,
      breakdown: { skipped: true },
      reasons: [],
    };
  }

  const fullText = getBlogFullText(pack);
  const persona =
    pack._meta?.personaEngineAlignment ||
    scorePersonaEngineAlignment(pack, input);
  const belief =
    pack._meta?.humanBelief || scoreHumanBelief(fullText, { ...input, input }, pack);
  const explain = assessContentExplainabilityForPublish(input);
  const complete = assertCompleteBlogPackForDelivery(pack, input);

  const personaScore = persona?.score ?? 0;
  const beliefScore = belief?.score ?? 0;
  const explainScore = explain.ok ? 100 : Math.max(0, 40 - (explain.reasons?.length || 0) * 8);
  const completeScore = complete.ok ? 100 : Math.max(0, 55 - (complete.reasons?.length || 0) * 10);

  const score = Math.round(
    personaScore * WEIGHTS.persona +
      beliefScore * WEIGHTS.humanBelief +
      explainScore * WEIGHTS.explainability +
      completeScore * WEIGHTS.completeDelivery
  );

  const reasons = [];
  if (!persona?.ok) reasons.push("persona_misaligned");
  if (!belief?.ok || beliefScore < HUMAN_BELIEF_MIN_SCORE) reasons.push("human_belief_low");
  if (!explain.ok) reasons.push("not_explainable");
  if (!complete.ok) reasons.push(...(complete.reasons || []));

  const publishReady =
    persona?.ok &&
    belief?.ok &&
    beliefScore >= HUMAN_BELIEF_MIN_SCORE &&
    explain.ok &&
    complete.ok;

  return {
    version: SQV_VERSION,
    score: Math.max(0, Math.min(100, score)),
    grade: gradeFromScore(score),
    publishReady,
    breakdown: {
      persona: personaScore,
      humanBelief: beliefScore,
      explainability: explainScore,
      completeDelivery: completeScore,
    },
    reasons: [...new Set(reasons)],
    personaId: persona?.profile?.id,
    speakerLabel: persona?.profile?.v4Label || persona?.profile?.personaLabel,
  };
}

/** pack._meta.sqv 에 스탬프 */
export function stampContentQualityValue(pack, input = {}) {
  if (!pack) return pack;
  const sqv = computeContentQualityValue(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      sqv,
      contentQualityValue: sqv.score,
      publishReady: sqv.publishReady,
    },
  };
}
