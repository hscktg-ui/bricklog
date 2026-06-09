/**
 * 「사람이 직접 쓴 것 같은 글」— 고객 배달 전 최종 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  assessCompletionReadiness,
  PREVIEW_WITHHOLD_REASONS,
} from "@/lib/product/completionStandard";
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine";
import { assessSpeakerTopicAlignment } from "@/lib/persona/speakerTopicGuide";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import {
  assertResearchPersonaGrounding,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessNoNewFactsForPublish } from "@/lib/product/brandJournalistDirective";
import { assertNextEvolutionPostWrite } from "@/lib/product/briclogNextEvolutionDirective";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { assessPostWriteInformationDensity } from "@/lib/product/informationDensityEngine";
import { assertTopicLockPostWrite } from "@/lib/product/topicLockEngine";
import { assertTopicAnswerPostWrite } from "@/lib/product/topicAnswerEngine";

const INFO_GUIDE_PAD_RE = [
  /성분·보관·선물/,
  /첨가물·알레르기\s*표기/,
  /알아보게\s*된\s*이유/,
  /고를\s*때\s*체크\s*포인트/,
  /왜\s+.+찾게\s*되는가/,
];

export { assessVisitSpeakerAlignment, assessInformationalSpeakerAlignment } from "@/lib/persona/speakerTopicGuide";

/**
 * @param {object} pack
 * @param {object} input
 */
export function detectInformationalGuideVoice(pack, input = {}) {
  const full = getBlogFullText(pack);
  const headings = (pack?.sections || []).map((s) => s.heading).join("\n");
  const hits = INFO_GUIDE_PAD_RE.filter((re) => re.test(full) || re.test(headings));
  const missionFallback = Boolean(
    pack?._meta?.missionProseFallback || pack?._meta?.draftFallback
  );
  return {
    ok: hits.length === 0,
    hits: hits.map((re) => re.source),
    missionFallback,
  };
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {object} [gate]
 */
export function assessHumanWritingDelivery(pack, input = {}, gate = {}) {
  const readiness = assessCompletionReadiness(pack, input, gate);
  const reasons = [...readiness.reasons];

  const visit = detectVisitReviewTemplateContamination(pack, input);
  if (!visit.ok) {
    for (const v of visit.violations || []) {
      const code =
        v.type === "product_info_pad"
          ? "checklist_voice"
          : "visit_review_template_contamination";
      if (!reasons.includes(code)) reasons.push(code);
    }
  }

  const infoGuide = detectInformationalGuideVoice(pack, input);
  if (!infoGuide.ok) {
    if (!reasons.includes("checklist_voice")) reasons.push("checklist_voice");
    if (!reasons.includes("v2axis_banned_template")) {
      reasons.push("v2axis_banned_template");
    }
  }
  if (infoGuide.missionFallback && isBriclogMissionEnforced()) {
    const belief = scoreHumanBelief(getBlogFullText(pack), input, pack);
    if (!belief.ok || belief.score < HUMAN_BELIEF_MIN_SCORE) {
      if (!reasons.includes("coverage_slot_dump")) reasons.push("coverage_slot_dump");
    }
  }

  const checklist = scoreChecklistVoice(getBlogFullText(pack), pack);
  if (!checklist.ok) {
    for (const r of checklist.issues) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const speakerAlign = assessSpeakerTopicAlignment(input);
  if (!speakerAlign.ok && speakerAlign.code) {
    if (!reasons.includes(speakerAlign.code)) {
      reasons.push(speakerAlign.code);
    }
  }

  if (isInformationalTopicInput(input)) {
    const infoYield = scoreInformationYield(getBlogFullText(pack), { input }, "blog");
    if (!infoYield.ok && !reasons.includes("information_yield_low")) {
      reasons.push("information_yield_low");
    }
  }

  const mergedFacts = collectMergedResearchFacts(input);
  if (mergedFacts.length > 0 && !hasUsableResearchFacts(input)) {
    if (!reasons.includes("research_facts_thin")) {
      reasons.push("research_facts_thin");
    }
  }

  if (hasUsableResearchFacts(input)) {
    const grounded = scoreGroundedSpecificity(pack, { input, ...input }, collectMergedResearchFacts(input));
    if (!grounded.ok) {
      const researchBuilt = Boolean(
        pack?._meta?.researchGroundedHumanPack || pack?._meta?.researchFactsWoven
      );
      for (const issue of grounded.issues || []) {
        if (
          issue === "grounding_ratio_low" &&
          researchBuilt &&
          grounded.factAnchors >= 2
        ) {
          continue;
        }
        if (!reasons.includes(issue)) reasons.push(issue);
      }
    }
    const rp = assertResearchPersonaGrounding(pack, input);
    if (!rp.ok) {
      for (const r of rp.reasons || []) {
        if (!reasons.includes(r)) reasons.push(r);
      }
    }
  }

  const newFactsGate = assessNoNewFactsForPublish(pack, input);
  if (!newFactsGate.ok) {
    for (const r of newFactsGate.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const evolutionPost = assertNextEvolutionPostWrite(pack, input);
  if (!evolutionPost.ok) {
    for (const r of evolutionPost.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const aiPatterns = detectAiWritingPatterns(pack, input);
  if (!aiPatterns.ok) {
    for (const r of aiPatterns.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const postDensity = assessPostWriteInformationDensity(pack, input);
  if (!postDensity.ok && !reasons.includes("information_yield_low")) {
    reasons.push("information_yield_low");
  }

  const topicLockPost = assertTopicLockPostWrite(pack, input);
  if (!topicLockPost.ok && !topicLockPost.skipped) {
    for (const r of topicLockPost.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const topicAnswer = assertTopicAnswerPostWrite(pack, input);
  if (!topicAnswer.ok && !topicAnswer.skipped) {
    for (const r of topicAnswer.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const HUMAN_VOICE_BLOCK = new Set([
    "human_belief_low",
    "brochure_voice",
    "ad_smell_high",
    "brand_reintro",
    "checklist_voice",
    "checklist_template_high",
    "coverage_slot_dump",
    "confirm_sentence_flood",
    "visit_review_template_contamination",
    "v2axis_banned_template",
    "forbidden_surface",
    "grounded_facts_low",
    "grounding_ratio_low",
    "concrete_detail_low",
    "persona_voice_weak",
    "visit_speaker_mismatch",
    "info_speaker_mismatch",
    "info_speaker_weak",
    "research_facts_thin",
    "information_yield_low",
    "no_new_verified_facts",
    "search_snippet_leak",
    "insufficient_verified_brand_facts",
    "insufficient_brand_knowledge",
    "industry_contamination",
    "ai_pattern_detected",
    "topic_lock_contamination",
    "topic_lock_foreign_entity",
    "topic_lock_low_relevance",
    "title_answer_insufficient",
    "title_answer_missing_required",
  ]);

  const voiceReasons = reasons.filter((r) => HUMAN_VOICE_BLOCK.has(r));
  const humanReady =
    visit.ok &&
    infoGuide.ok &&
    checklist.ok &&
    speakerAlign.ok &&
    voiceReasons.length === 0;

  return {
    humanReady,
    displayReady: readiness.displayReady && humanReady,
    hardBlock: !humanReady,
    reasons: [...new Set(reasons)],
    readiness,
    visit,
    infoGuide,
    checklist,
  };
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {object} [gate]
 */
export function shouldWithholdHumanWritingPack(pack, input = {}, gate = {}) {
  if (!isBriclogMissionEnforced()) return false;
  if (isLlmOriginatedPack(pack)) return false;
  if (pack?._meta?.missionProseFallback && (pack.sections?.length || 0) >= 2) {
    return false;
  }
  if (!pack?.sections?.length) return true;
  const assess = assessHumanWritingDelivery(pack, input, gate);
  if (!assess.humanReady) return true;

  const missionFallback = Boolean(
    pack?._meta?.missionProseFallback || pack?._meta?.draftFallback
  );
  if (missionFallback) {
    const completionReasons = assess.readiness?.reasons || [];
    const missionBlock = completionReasons.some(
      (r) =>
        r.startsWith("first_delivery_") ||
        r === "grounded_specificity_low" ||
        r === "research_facts_thin"
    );
    if (missionBlock) return true;
  }
  return false;
}
