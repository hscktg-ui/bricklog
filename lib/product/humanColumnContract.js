/**
 * 사람 칼럼 계약 SSOT — 분량 + 경험형 말투 + AI 흔적 없음
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { HUMAN_MIN_SECTIONS, DELIVERY_GRADE } from "@/lib/product/deliveryGrade";
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
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";
import { detectInformationalGuideVoice } from "@/lib/product/humanWritingDeliveryGate";
import { detectMagazineArcIssues } from "@/lib/content/columnMagazineArchetype";
import { scoreNarrativeCoherence } from "@/lib/product/narrativeArcShapeEngine";

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

  const tierMet = sections >= HUMAN_MIN_SECTIONS && chars >= tier.min;
  const visit = detectVisitReviewTemplateContamination(pack, input);
  const infoGuide = detectInformationalGuideVoice(pack, input);
  const checklist = scoreChecklistVoice(full, pack);
  const experience = scoreExperienceVoice(full);
  const belief = scoreHumanBelief(full, input, pack);
  const aiPatterns = detectAiWritingPatterns(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const magazineArc = detectMagazineArcIssues(pack, input);
  const narrative = scoreNarrativeCoherence(pack, input);

  const experienceOk = experience.ok || experience.score >= EXPERIENCE_VOICE_PASS;
  const beliefOk = belief.ok && belief.score >= HUMAN_BELIEF_MIN_SCORE;

  const humanVoiceMet =
    visit.ok &&
    infoGuide.ok &&
    checklist.ok &&
    experienceOk &&
    beliefOk &&
    aiPatterns.ok;

  const reasons = [];
  if (!tierMet) reasons.push("length_tier_under");
  if (!visit.ok) reasons.push("visit_review_template_contamination");
  if (!infoGuide.ok) reasons.push("checklist_voice");
  if (!checklist.ok) reasons.push(...(checklist.issues || []));
  if (!experienceOk) reasons.push("experience_voice_low");
  if (!beliefOk) reasons.push("human_belief_low");
  if (!aiPatterns.ok) reasons.push("ai_pattern_detected");
  if (!humanWriting.humanReady) {
    reasons.push(
      ...(humanWriting.reasons || []).filter((r) => !reasons.includes(r)).slice(0, 4)
    );
  }
  if (!magazineArc.ok) {
    for (const issue of magazineArc.issues || []) {
      if (issue?.type && !reasons.includes(issue.type)) reasons.push(issue.type);
    }
  }
  if (!narrative.ok) {
    for (const r of narrative.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  return {
    version: HUMAN_COLUMN_CONTRACT_VERSION,
    ok: tierMet && humanVoiceMet,
    tierMet,
    humanVoiceMet,
    chars,
    sections,
    tierMin: tier.min,
    tierTarget: tier.target,
    experienceScore: experience.score,
    beliefScore: belief.score,
    magazineArcScore: magazineArc.arc?.score,
    narrativeCoherenceScore: narrative.score,
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
  if (!contract?.tierMet) return DELIVERY_GRADE.DRAFT;
  if (!contract?.humanVoiceMet) return DELIVERY_GRADE.DRAFT;
  const rescue =
    meta.deliveryRescue || meta.missionProseFallback || meta.draftFallback;
  if (rescue) return DELIVERY_GRADE.HUMAN;
  if (
    meta.publishReady === true &&
    meta.sqv?.publishReady === true &&
    !rescue
  ) {
    return DELIVERY_GRADE.PUBLISH;
  }
  return DELIVERY_GRADE.HUMAN;
}
