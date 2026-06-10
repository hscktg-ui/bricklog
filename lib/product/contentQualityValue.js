/**
 * SQV — Single Quality Value (글 품질값 SSOT)
 * UI·리포트·출고 판정에 하나의 점수·등급을 제공한다.
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { scorePersonaEngineAlignment } from "@/lib/persona/personaEngineProfile";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { assertCompleteBlogPackForDelivery } from "@/lib/product/completeDeliveryGate";
import { assessContentExplainabilityForPublish } from "@/lib/product/briclogContentDoctrine";
import {
  scoreSpeakerSurfaceAlignment,
  isFieldReviewSpeaker,
} from "@/lib/persona/speakerVoiceLock";
import { detectVerbatimTopicUsage } from "@/lib/content/informationUnitEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
} from "@/lib/product/missionCatalogDelivery";
import {
  calibrateSqvForProfessionalEditor,
  resolveEditorColumnMinChars,
  isContentEvaluationEditorPass,
  isProfessionalEditorGradeEligible,
  EDITOR_GRADE_A_SCORE,
} from "@/lib/product/professionalEditorGradeEngine";

export const SQV_VERSION = "v3-editor";

const WEIGHTS = {
  persona: 0.24,
  humanBelief: 0.2,
  explainability: 0.16,
  completeDelivery: 0.24,
  speakerSurface: 0.16,
};

function gradeFromScore(score) {
  if (score >= EDITOR_GRADE_A_SCORE) return "A";
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
  const speaker =
    pack._meta?.speakerSurfaceAlignment ||
    scoreSpeakerSurfaceAlignment(pack, input);
  const verbatim = detectVerbatimTopicUsage(pack, input);

  const missionCatalog = isMissionCatalogDeliveryPack(pack, input);
  const missionEvalPass = missionCatalog && isMissionCatalogEvalPass(pack);
  const editorEvalPass = isContentEvaluationEditorPass(pack);
  const editorEligible = isProfessionalEditorGradeEligible(pack, input);
  const editorMin = resolveEditorColumnMinChars(input);
  const chars = countBlogBodyCharsWithSpaces(pack);

  let personaScore = persona?.score ?? 0;
  let beliefScore = belief?.score ?? 0;
  let explainScore = explain.ok ? 100 : Math.max(0, 40 - (explain.reasons?.length || 0) * 8);
  let completeScore = complete.ok ? 100 : Math.max(0, 55 - (complete.reasons?.length || 0) * 10);
  let speakerScore = speaker?.score ?? (isFieldReviewSpeaker(input) ? 100 : 0);

  const editorBoost = missionEvalPass || editorEvalPass || editorEligible;
  if (editorBoost) {
    beliefScore = Math.max(beliefScore, HUMAN_BELIEF_MIN_SCORE);
    explainScore = 100;
    personaScore = Math.max(personaScore, 82);
    speakerScore = Math.max(speakerScore, 90);
    if (chars >= editorMin && (pack.sections?.length || 0) >= HUMAN_MIN_SECTIONS) {
      completeScore = 100;
    } else {
      completeScore = Math.max(completeScore, 80);
    }
  }

  const raw = {
    version: SQV_VERSION,
    score: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          personaScore * WEIGHTS.persona +
            beliefScore * WEIGHTS.humanBelief +
            explainScore * WEIGHTS.explainability +
            completeScore * WEIGHTS.completeDelivery +
            speakerScore * WEIGHTS.speakerSurface
        )
      )
    ),
    breakdown: {
      persona: personaScore,
      humanBelief: beliefScore,
      explainability: explainScore,
      completeDelivery: completeScore,
      speakerSurface: speakerScore,
    },
    personaId: persona?.profile?.id,
    speakerLabel: persona?.profile?.v4Label || persona?.profile?.label,
  };

  const reasons = [];
  if (!persona?.ok && !editorBoost) reasons.push("persona_misaligned");
  if ((!belief?.ok || beliefScore < HUMAN_BELIEF_MIN_SCORE) && !editorBoost) {
    reasons.push("human_belief_low");
  }
  if (!explain.ok && !editorBoost) reasons.push("not_explainable");
  if (!complete.ok && !editorBoost) reasons.push(...(complete.reasons || []));
  if (!isFieldReviewSpeaker(input) && !speaker?.ok && !editorBoost) {
    reasons.push("speaker_surface_leak");
    for (const issue of speaker?.issues || []) {
      if (issue?.type) reasons.push(issue.type);
    }
  }
  const verbatimOk = verbatim.ok || editorBoost;
  if (!verbatimOk) reasons.push("verbatim_topic_repeat");

  const speakerOk =
    isFieldReviewSpeaker(input) || speaker?.ok !== false || editorBoost;
  const personaOk = persona?.ok || editorBoost;
  const beliefOk = belief?.ok || editorBoost;
  const explainOk = explain.ok || editorBoost;
  const completeOk = complete.ok || (editorBoost && completeScore >= 80);
  const publishReady =
    personaOk &&
    beliefOk &&
    beliefScore >= HUMAN_BELIEF_MIN_SCORE &&
    explainOk &&
    completeOk &&
    speakerOk &&
    verbatimOk;

  const sqv = {
    ...raw,
    grade: gradeFromScore(raw.score),
    publishReady,
    reasons: [...new Set(reasons)],
  };

  return calibrateSqvForProfessionalEditor(sqv, pack, input);
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
      professionalEditorGrade: sqv.professionalEditorGrade || undefined,
    },
  };
}
