/**
 * BRICLOG Quality Stack — 2026-08-11 SSOT
 *
 * 「지금 구현 가능한」 품질 기술을 한 경로로 스탬프·적용한다.
 * 신규 LLM 호출 없이 로컬 게이트·Safe Edit·구조·브랜드·경험 축을 묶는다.
 *
 * 카탈로그 상수는 순환 import TDZ 방지를 위해 리터럴로 둔다.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import {
  isBriclogAlwaysDeliverEnabled,
  isBriclogMasterRebuildEnforced,
} from "@/lib/config/masterRebuildFlags";
import {
  isBriclogExplainV3Enforced,
  applyExplainRepairToPack,
} from "@/lib/product/briclogExplainEngine";
import {
  isBriclogExperienceOpinionEnforced,
  applyExperienceRepairToPack,
} from "@/lib/product/briclogExperienceOpinionEngine";
import { isBriclogResearchFirstEnforced } from "@/lib/config/researchFirstFlags";
import { isBriclogCoreRulesEnforced } from "@/lib/product/briclogCoreRules";
import { applyParagraphSafeEdit } from "@/lib/golden/paragraphSafeEditEngine";
import { injectBrandFactsIntoPack } from "@/lib/content/brandFactInjectionEngine";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { runIndustryPipelineSanitize } from "@/lib/product/industryPipelineRouter";
import { assessStructureScore } from "@/lib/quality/structureScoreKpi";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { assessContentTrustReadable } from "@/lib/quality/qualityTrustKpi";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { QUALITY_NORTH_STAR_VERSION } from "@/lib/product/qualityNorthStar";

export const QUALITY_AUG2026_STACK_VERSION = "quality-aug2026-v1";
export const QUALITY_AUG2026_AS_OF = "2026-08-11";

/** 구현·송출 경로에 넣는 기술 카탈로그 (측정·스탬프용) */
export const QUALITY_AUG2026_TECHNOLOGIES = Object.freeze([
  { id: "content_evaluation_100", label: "100점 평가 엔진", passMin: 90 },
  { id: "reset_quality_gate", label: "Reset 품질 게이트", passMin: 90 },
  { id: "quality_trust_kpi", label: "글 신뢰도 KPI", targetRate: 0.9 },
  { id: "structure_score_kpi", label: "구조 점수(리드·경험·지역·브랜드)", passMin: 70 },
  { id: "human_belief", label: "사람이 썼네 판정", passMin: 85 },
  { id: "research_first", label: "조사 우선 파이프라인" },
  { id: "explain_v3", label: "Explain V3 (설명·이유·활용)" },
  { id: "experience_opinion", label: "관찰·경험·의견 연결" },
  { id: "paragraph_safe_edit", label: "문단 Safe Edit (85% 보존)" },
  { id: "brand_fact_injection", label: "브랜드 팩트 강제 주입 (≥3)" },
  { id: "industry_pipeline_lock", label: "업종 락·오염 제거" },
  { id: "placeholder_trace_scrub", label: "Placeholder 추적·scrub" },
  { id: "unified_delivery_gate", label: "송출 판정 단일화" },
  { id: "quality_leap_finish", label: "Quality Leap (LLM 없이 스탬프)" },
  { id: "sovereign_always_deliver", label: "Sovereign Always Deliver" },
  { id: "core_rules", label: "Core1 사람글 · Core2 브랜드 기억" },
  { id: "evaluate_first", label: "평가 우선 12단계" },
]);

export function isQualityAug2026StackEnforced() {
  if (process.env.BRICLOG_QUALITY_AUG2026 === "false") return false;
  if (process.env.BRICLOG_QUALITY_AUG2026 === "true") return true;
  return isBriclogResetQualityEnforced();
}

export function summarizeQualityAug2026Stack() {
  return {
    version: QUALITY_AUG2026_STACK_VERSION,
    asOf: QUALITY_AUG2026_AS_OF,
    enforced: isQualityAug2026StackEnforced(),
    flags: {
      resetQuality: isBriclogResetQualityEnforced(),
      masterRebuild: isBriclogMasterRebuildEnforced(),
      alwaysDeliver: isBriclogAlwaysDeliverEnabled(),
      researchFirst: isBriclogResearchFirstEnforced(),
      explainV3: isBriclogExplainV3Enforced(),
      experienceOpinion: isBriclogExperienceOpinionEnforced(),
      coreRules: isBriclogCoreRulesEnforced(),
    },
    technologies: QUALITY_AUG2026_TECHNOLOGIES.map((t) => t.id),
    northStar: QUALITY_NORTH_STAR_VERSION,
  };
}

/**
 * 로컬 finish — placeholder scrub → 업종 sanitize → brand inject →
 * explain/experience repair(점수가 떨어지면 롤백) → paragraph Safe Edit → structure stamp
 */
export function applyQualityAug2026Finish(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;
  if (!isQualityAug2026StackEnforced() && opts.force !== true) return pack;

  let next = scrubPlaceholderFromPack(pack);
  next = runIndustryPipelineSanitize(next, input);
  next = injectBrandFactsIntoPack(next, input);

  const beforeEval = assessContentEvaluation(next, input);
  const beforeBelief = scoreHumanBelief(getBlogFullText(next), { input }, next);

  const needsExplainRepair =
    (isBriclogExplainV3Enforced() || opts.force === true) &&
    (beforeEval.checks?.explainQuality?.hollow > 0 ||
      beforeEval.checks?.explainQuality?.keywordLeaks > 0 ||
      (beforeEval.checks?.explainQuality?.rate ?? 1) < 0.35);

  const needsExperienceRepair =
    (isBriclogExperienceOpinionEnforced() || opts.force === true) &&
    ((beforeEval.checks?.experienceQuality?.dryFacts ?? 0) > 0 ||
      (beforeEval.checks?.experienceQuality?.rate ?? 1) < 0.55);

  let repaired = next;
  let attemptedRepair = false;
  if (needsExplainRepair) {
    attemptedRepair = true;
    try {
      repaired = applyExplainRepairToPack(repaired, input);
    } catch {
      /* optional */
    }
  }
  if (needsExperienceRepair) {
    attemptedRepair = true;
    try {
      repaired = applyExperienceRepairToPack(repaired, input);
    } catch {
      /* optional */
    }
  }

  let repairRolledBack = false;
  if (attemptedRepair && repaired !== next) {
    const afterBelief = scoreHumanBelief(getBlogFullText(repaired), { input }, repaired);
    const afterEval = assessContentEvaluation(repaired, input);
    const beliefDropped = (afterBelief?.score ?? 0) + 5 < (beforeBelief?.score ?? 0);
    const evalDropped = afterEval.score + 3 < beforeEval.score;
    if (beliefDropped || evalDropped) {
      repairRolledBack = true;
    } else {
      next = repaired;
    }
  }

  let evaluation = assessContentEvaluation(next, input);
  if (!evaluation.pass || opts.forceSafeEdit === true) {
    next = applyParagraphSafeEdit(next, input, evaluation);
    next = injectBrandFactsIntoPack(next, input);
    next = scrubPlaceholderFromPack(next);
    evaluation = assessContentEvaluation(next, input);
  }

  const structure = assessStructureScore(next, input);
  const trust = assessContentTrustReadable(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      qualityAug2026Stack: {
        version: QUALITY_AUG2026_STACK_VERSION,
        asOf: QUALITY_AUG2026_AS_OF,
        technologies: QUALITY_AUG2026_TECHNOLOGIES.map((t) => t.id),
        structure,
        trust,
        contentEvalScore: evaluation.score,
        contentEvalPass: evaluation.pass,
        bodyChars: getBlogFullText(next).replace(/\s/g, "").length,
        repairRolledBack,
      },
      structureScore: structure,
      structureOk: structure.ok,
      trustReadable: trust.readable,
    },
  };
}

export function stampQualityAug2026Stack(pack, _input = {}) {
  if (!pack) return pack;
  const summary = summarizeQualityAug2026Stack();
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      qualityAug2026: summary,
      qualityAug2026Version: QUALITY_AUG2026_STACK_VERSION,
    },
  };
}
