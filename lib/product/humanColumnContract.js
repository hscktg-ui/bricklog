/**
 * 사람 칼럼 계약 SSOT — 분량 + 경험형 말투 + AI 흔적 없음
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { HUMAN_MIN_SECTIONS, DELIVERY_GRADE } from "@/lib/product/deliveryGradeConstants";
import { assessHumanWritingDelivery } from "@/lib/product/humanWritingDeliveryGate";
import {
  scoreExperienceVoice,
  EXPERIENCE_VOICE_PASS,
} from "@/lib/content/experienceVoiceProfile";
import {
  scoreHumanBelief,
  HUMAN_BELIEF_MIN_SCORE,
} from "@/lib/product/humanBeliefEngine";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { scoreHumanColumnProseContamination } from "@/lib/product/humanColumnProseEngine";
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";
import { detectInformationalGuideVoice } from "@/lib/product/humanWritingDeliveryGate";
import { scoreNarrativeCoherence } from "@/lib/product/narrativeArcShapeEngine";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
} from "@/lib/product/missionCatalogDelivery";
import {
  resolveEditorColumnMinChars,
  isContentEvaluationEditorPass,
  isProfessionalEditorGradeEligible,
} from "@/lib/product/professionalEditorGradeEngine";
import { resolveLocalBatchBlogMinChars } from "@/lib/content/missionProseGate";

export const HUMAN_COLUMN_CONTRACT_VERSION = "v1";

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessHumanColumnContract(pack, input = {}) {
  const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const sections = pack?.sections?.length || 0;
  const chars = countBlogBodyCharsWithSpaces(pack);
  const full = getBlogFullText(pack);

  const catalogPack = isMissionCatalogDeliveryPack(pack, input);
  const localBatchFinish = pack?._meta?.localBatchFinish === true;
  const missionGoldenScore =
    pack?._meta?.goldenGate?.score ?? pack?._meta?.sqv?.score ?? 0;
  const missionPublishReady =
    pack?._meta?.missionProseFallback === true &&
    (pack?._meta?.publishReady === true || missionGoldenScore >= 74);
  const editorPass =
    isProfessionalEditorGradeEligible(pack, input) ||
    isContentEvaluationEditorPass(pack);
  const defaultEffectiveMin =
    catalogPack || editorPass || pack?._meta?.contentQualityDelivered
      ? resolveEditorColumnMinChars(input)
      : tier.min;
  const effectiveMin = localBatchFinish
    ? resolveLocalBatchBlogMinChars(tierKey, tier)
    : missionPublishReady
      ? Math.min(defaultEffectiveMin, resolveLocalBatchBlogMinChars(tierKey, tier))
      : defaultEffectiveMin;
  const tierMet = sections >= HUMAN_MIN_SECTIONS && chars >= effectiveMin;
  const visit = detectVisitReviewTemplateContamination(pack, input);
  const infoGuide = detectInformationalGuideVoice(pack, input);
  const checklist = scoreChecklistVoice(full, pack);
  const experience = scoreExperienceVoice(full);
  const belief = scoreHumanBelief(full, input, pack);
  const aiPatterns = detectAiWritingPatterns(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const narrative = scoreNarrativeCoherence(pack, input);
  const proseContamination = scoreHumanColumnProseContamination(pack, input);

  const catalogEvalPass = catalogPack && isMissionCatalogEvalPass(pack);
  const editorVoicePass = catalogEvalPass || editorPass;
  const missionVoicePass =
    missionPublishReady &&
    (pack?._meta?.goldenGate?.score ?? pack?._meta?.sqv?.score ?? 0) >= 74 &&
    checklist.ok &&
    proseContamination.ok &&
    visit.ok &&
    infoGuide.ok;
  const experienceOk =
    editorVoicePass ||
    missionVoicePass ||
    experience.ok ||
    experience.score >= EXPERIENCE_VOICE_PASS;
  const beliefOk =
    editorVoicePass ||
    missionVoicePass ||
    (belief.ok && belief.score >= HUMAN_BELIEF_MIN_SCORE);
  const narrativeOk =
    editorVoicePass ||
    missionVoicePass ||
    (narrative.ok && (narrative.score || 0) >= 72);

  const humanVoiceMet =
    visit.ok &&
    infoGuide.ok &&
    checklist.ok &&
    proseContamination.ok &&
    experienceOk &&
    beliefOk &&
    (aiPatterns.ok || missionVoicePass) &&
    narrativeOk;

  const reasons = [];
  if (!tierMet) reasons.push("length_tier_under");
  if (!visit.ok) reasons.push("visit_review_template_contamination");
  if (!infoGuide.ok) reasons.push("checklist_voice");
  if (!checklist.ok) reasons.push(...(checklist.issues || []));
  if (!proseContamination.ok) reasons.push("catalog_prose_contamination");
  if (!experienceOk) reasons.push("experience_voice_low");
  if (!beliefOk) reasons.push("human_belief_low");
  if (!aiPatterns.ok) reasons.push("ai_pattern_detected");
  if (!narrativeOk) reasons.push(...(narrative.reasons || ["narrative_arc_weak"]).slice(0, 3));
  if (!humanWriting.humanReady && !editorVoicePass) {
    reasons.push(
      ...(humanWriting.reasons || []).filter((r) => !reasons.includes(r)).slice(0, 4)
    );
  }

  return {
    version: HUMAN_COLUMN_CONTRACT_VERSION,
    ok: tierMet && humanVoiceMet,
    tierMet,
    humanVoiceMet,
    chars,
    sections,
    tierMin: effectiveMin,
    tierTarget: tier.target,
    experienceScore: experience.score,
    beliefScore: belief.score,
    narrativeScore: narrative.score,
    proseContamination,
    reasons: [...new Set(reasons)],
  };
}

export function humanColumnContractLabelKo(contract) {
  if (contract?.ok) return "사람이 쓴 칼럼";
  if (contract?.tierMet && !contract?.humanVoiceMet) return "말투·경험 다듬는 중";
  if (!contract?.tierMet) return "분량 맞추는 중";
  return "초안";
}

export function contractToDeliveryGrade(contract, meta = {}) {
  const editorPass =
    meta.professionalEditorGrade === true ||
    meta.sqv?.professionalEditorGrade === true ||
    (meta.contentEvaluation?.pass === true && meta.contentQualityDelivered === true) ||
    (meta.forcedMissionProseRoute && meta.contentEvaluation?.pass === true);
  if (
    !contract?.tierMet &&
    !(editorPass && contract?.chars >= (contract?.tierMin || 0))
  ) {
    return DELIVERY_GRADE.DRAFT;
  }
  if (!contract?.humanVoiceMet && !editorPass) return DELIVERY_GRADE.DRAFT;
  const rescue =
    meta.deliveryRescue || meta.missionProseFallback || meta.draftFallback;
  if (rescue || editorPass) return DELIVERY_GRADE.HUMAN;
  if (
    meta.publishReady === true &&
    meta.sqv?.publishReady === true &&
    !rescue
  ) {
    return DELIVERY_GRADE.PUBLISH;
  }
  return DELIVERY_GRADE.HUMAN;
}
