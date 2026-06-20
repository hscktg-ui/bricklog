/**
 * V17 / CRITICAL FIX — Information Score (글자수가 아닌 정보량)
 */
import { detectExcessiveRepetition } from "@/lib/content/repetitionEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  buildSectionPlan,
  scoreSectionPlanCoverage,
} from "@/lib/content/sectionPlannerEngine";
import { scoreIndustryDensity } from "@/lib/content/industryDensityEngine";
import { scoreRegionDensity } from "@/lib/content/regionDensityEngine";
import { scoreInputTopicDominance } from "@/lib/content/v13ContentGate";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness";
import { factTextsFromList } from "@/lib/content/v2ResearchFacts";

export const INFORMATION_PASS_SCORE = 80;

function scoreResearchFactCoverage(full, input = {}) {
  const facts = factTextsFromList(collectMergedResearchFactsFromInput(input));
  if (facts.length < 2) {
    return { ok: true, ratio: 1, covered: facts.length, total: facts.length };
  }
  const sample = facts.slice(0, 10);
  let covered = 0;
  for (const f of sample) {
    const anchor = f.length > 16 ? f.slice(0, 14) : f;
    if (full.includes(f) || (anchor.length >= 6 && full.includes(anchor))) {
      covered += 1;
    }
  }
  const ratio = sample.length ? covered / sample.length : 1;
  return {
    ok: ratio >= 0.3,
    ratio,
    covered,
    total: sample.length,
  };
}

/**
 * 0–100 정보량 점수 — 80 미만 재생성
 */
export function scoreInformationYield(full, ctx = {}, channel = "blog") {
  const input = ctx.input || ctx;
  const reasons = [];
  let score = 100;

  if (channel !== "blog") {
    const short = String(full || "").replace(/\s/g, "").length;
    const plan = buildSectionPlan(ctx, input);
    const pseudo = { detailBody: full, body: full, hook: full };
    const coverage = scoreSectionPlanCoverage(plan, pseudo, channel);
    score = coverage.ok ? 88 : 72;
    return {
      score,
      ok: score >= INFORMATION_PASS_SCORE,
      reasons: coverage.ok ? [] : ["information_units_low"],
      planCoverage: coverage,
    };
  }

  const plan = buildSectionPlan(ctx, input);
  const pseudoPack = {
    title: "",
    sections: String(full || "")
      .split(/\n{2,}/)
      .filter(Boolean)
      .slice(0, 20)
      .map((block, i) => ({
        heading: `block-${i}`,
        body: block,
      })),
    conclusion: "",
  };
  const planCoverage = scoreSectionPlanCoverage(plan, { ...pseudoPack, sections: extractSectionsFromFull(full) }, "blog");
  const researchCoverage = scoreResearchFactCoverage(full, input);
  const researchBacked = collectMergedResearchFactsFromInput(input).length >= 2;
  const researchYieldRelief = researchBacked && researchCoverage.ok;

  if (!planCoverage.ok) {
    const penalty = Math.round((1 - planCoverage.ratio) * 30);
    score -= researchYieldRelief ? Math.round(penalty * 0.45) : penalty;
    if (!researchYieldRelief) reasons.push("information_units_low");
  }

  const dominance = scoreInputTopicDominance(full, { ...ctx, input }, channel);
  if (!dominance.ok) {
    score -= researchYieldRelief ? 6 : 15;
    if (!researchYieldRelief) reasons.push("topic_dominance_low");
  }

  const industry = scoreIndustryDensity(full, ctx);
  if (!industry.ok) {
    score -= researchYieldRelief ? 5 : 12;
    if (!researchYieldRelief) reasons.push("industry_density_low");
  }

  const region = scoreRegionDensity(full, ctx);
  if (!region.ok && !region.skipped) {
    score -= researchYieldRelief ? 3 : 8;
    if (!researchYieldRelief) reasons.push("region_density_low");
  }

  const repetition = detectExcessiveRepetition(full);
  if (!repetition.ok) {
    score -= 22;
    reasons.push("excessive_repetition");
  }

  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });
  if (!dup.ok) {
    score -= Math.min(30, dup.issues.length * 10);
    reasons.push("duplicate_killer_fail");
  }

  const capped = Math.max(0, Math.min(100, score));
  const passScore = isBriclogMissionEnforced() ? 72 : INFORMATION_PASS_SCORE;
  return {
    score: capped,
    ok: capped >= passScore,
    reasons: [...new Set(reasons)],
    planCoverage,
    researchCoverage,
    dominance,
    industry,
    region,
    duplicate: dup,
    newInfoUnits: planCoverage.covered?.length ?? 0,
    totalInfoUnits: planCoverage.total ?? 0,
  };
}

function extractSectionsFromFull(full) {
  const parts = String(full || "").split(/\n{2,}/).filter((p) => p.trim().length > 40);
  if (parts.length <= 1) {
    return [{ heading: "본문", body: full }];
  }
  return parts.map((body, i) => ({ heading: `section-${i}`, body }));
}

export function needsInformationExpansion(yieldScore) {
  return !yieldScore.ok && yieldScore.score < INFORMATION_PASS_SCORE;
}
