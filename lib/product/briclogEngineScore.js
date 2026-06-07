/**
 * BRICLOG ENGINE SCORE — belief · checklist · naver · grounded 통합 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import {
  collectNaverWriteIssues,
  getNaverCategoryTargets,
  scoreNaverVoiceDensity,
} from "@/lib/channel/naverBlogEngineRules";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { scoreMagazineColumnArc } from "@/lib/content/columnMagazineArchetype";
import { scoreDeepLearning } from "@/lib/product/deepLearningEngine";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

export const BRICLOG_ENGINE_SCORE_VERSION = "v1";
export const BRICLOG_ENGINE_PASS = 85;
export const BRICLOG_ENGINE_EXCELLENT = 92;

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function scoreBriclogEngine(pack, ctx = {}) {
  if (!isBriclogMissionEnforced()) {
    return {
      version: BRICLOG_ENGINE_SCORE_VERSION,
      total: 100,
      ok: true,
      excellent: true,
      components: {},
      issues: [],
    };
  }

  const input = ctx.input || ctx;
  const full = getBlogFullText(pack);
  const belief = scoreHumanBelief(full, input, pack);
  const checklist = scoreChecklistVoice(full, pack);
  const grounded = scoreGroundedSpecificity(pack, { input, ...input }, collectMergedResearchFacts(input));
  const naverIssues = collectNaverWriteIssues(full, input);
  const magazineArc = scoreMagazineColumnArc(pack);
  const deepLearning = scoreDeepLearning(pack, input);
  const industry = input.industry || input.industryLabel || "";
  const targets = getNaverCategoryTargets(industry);
  const voiceHits = scoreNaverVoiceDensity(full);
  const voiceMin = Math.max(1, Math.round(targets.voiceRate / 40));

  let naverFit = 78;
  if (voiceHits >= voiceMin) naverFit += 12;
  if (!naverIssues.includes("naver_avoid_phrase")) naverFit += 6;
  if (!naverIssues.includes("checklist_voice")) naverFit += 6;
  naverFit -= naverIssues.length * 5;
  naverFit = clamp(naverFit);

  const total = clamp(
    belief.score * 0.28 +
      (checklist.ok ? 92 : Math.max(40, 92 - checklist.templateHits * 8)) * 0.16 +
      naverFit * 0.16 +
      (grounded.score || 72) * 0.14 +
      magazineArc.score * 0.08 +
      deepLearning.total * 0.18
  );

  const issues = [
    ...belief.issues,
    ...(checklist.ok ? [] : checklist.issues || ["checklist_voice"]),
    ...naverIssues,
    ...(grounded.ok ? [] : grounded.issues || []),
    ...(magazineArc.ok ? [] : magazineArc.reasons || ["magazine_arc_weak"]),
    ...(deepLearning.ok ? [] : deepLearning.issues || ["deep_learning_weak"]),
  ];

  const ok =
    total >= BRICLOG_ENGINE_PASS &&
    deepLearning.total >= 75 &&
    belief.ok &&
    checklist.ok &&
    !naverIssues.includes("naver_avoid_phrase") &&
    !naverIssues.includes("checklist_voice") &&
    !naverIssues.includes("josa_error");

  return {
    version: BRICLOG_ENGINE_SCORE_VERSION,
    total,
    ok,
    excellent: total >= BRICLOG_ENGINE_EXCELLENT && belief.score >= HUMAN_BELIEF_MIN_SCORE + 10,
    components: {
      belief: belief.score,
      beliefOk: belief.ok,
      checklistOk: checklist.ok,
      naverFit,
      voiceHits,
      voiceTarget: voiceMin,
      grounded: grounded.score,
      magazineArc: magazineArc.score,
      magazineArcOk: magazineArc.ok,
      toneBookendOk: magazineArc.bookends?.ok,
      deepLearning: deepLearning.total,
      deepLearningOk: deepLearning.ok,
      fieldScenes: deepLearning.dimensions?.fieldScenes,
    },
    issues: [...new Set(issues)],
  };
}
